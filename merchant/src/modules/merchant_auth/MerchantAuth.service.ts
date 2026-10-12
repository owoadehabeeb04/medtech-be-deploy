import { Request } from "express";
import { Merchant } from "../merchant/Merchant.model";
import { StoreDetails } from "../store_details/StoreDetails.model";
import { PaymentDetails } from "../payment_details/PaymentDetails.model";
import { MerchantSettings } from "../merchant_settings/MerchantSettings.model";
import { Wallet } from "../wallet/Wallet.model";
import { Subscription } from "../subscriptions/Subscription.model";
import { Plan } from "../subscriptions/Plan.model";
import { SubscriptionStatus, PlanTier } from "../../constants/enums";
import { MerchantVerificationService } from "../merchant_verification/MerchantVerification.service";
import { RefreshTokenService } from "../refresh_tokens/RefreshToken.service";
import { EmailService } from "../../service/Email/Email.service";
import {
  SignupDTO,
  VerifyOtpDTO,
  CompleteSignupDTO,
  LoginDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  ResendOtpDTO,
  CheckPhoneDTO,
} from "./MerchantAuth.dto";
import {
  generateOTP,
  generateUUID,
  splitOTPDigits,
  hashPassword,
  verifyPassword,
  generateToken,
} from "@medtech/utils";
import { applicationConfig } from "../../config";
import { isPhoneNumberTaken, PHONE_TAKEN_MESSAGE } from "../merchant/phone.util";

const { isProduction, otpExpiration } = applicationConfig;

// Minimum gap between two OTP emails for the same address
const OTP_RESEND_COOLDOWN_SECONDS = 30;

export interface ApiResponse {
  status: boolean;
  code: number;
  message: string;
  data?: any;
}

export class MerchantAuthService {
  static async signup(data: SignupDTO, req: Request): Promise<ApiResponse> {
    const { email, name } = data;

    // Check if merchant already exists
    const existingMerchant = await Merchant.findOne({ where: { email } });
    if (existingMerchant) {
      return {
        status: false,
        code: 400,
        message: "Email already registered",
      };
    }

    // Generate OTP
    const otp = generateOTP(4);
    const sessionId = generateUUID(); // For internal tracking

    // Store OTP in database with email and name
    await MerchantVerificationService.setSession({
      otp,
      sessionId,
      email,
      path: "signup",
      name,
    });

    // Prepare email data
    const emailData = {
      otpDigits: splitOTPDigits(otp),
      browserName: req.headers["user-agent"]?.split(" ")[0] || "Unknown",
      deviceOS: req.headers["user-agent"] || "Unknown",
      requestDate: new Date().toLocaleDateString(),
      ipAddress: req.ip || req.socket.remoteAddress,
      expiresInMinutes: otpExpiration,
    };

    try {
      await EmailService.sendSignupOtpEmail(email, emailData);
    } catch (error: any) {
      if (isProduction) {
        throw error;
      }
    }

    return {
      status: true,
      code: 200,
      message: "OTP sent to your email. Please check your inbox.",
      data: isProduction ? null : { otp }, // Show OTP in development only
    };
  }

  static async checkPhone(data: CheckPhoneDTO): Promise<ApiResponse> {
    const taken = await isPhoneNumberTaken(data.phoneCountryCode, data.phoneNumber);
    return {
      status: !taken,
      code: taken ? 400 : 200,
      message: taken ? PHONE_TAKEN_MESSAGE : "Phone number is available",
      data: { available: !taken },
    };
  }

  static async resendOtp(data: ResendOtpDTO, req: Request): Promise<ApiResponse> {
    const { email, purpose } = data;
    const latest = await MerchantVerificationService.getLatestSessionByEmail(email, purpose);

    if (purpose === "signup") {
      const existingMerchant = await Merchant.findOne({ where: { email } });
      if (existingMerchant) {
        return { status: false, code: 400, message: "Email already registered. Please login instead." };
      }
      if (!latest) {
        return { status: false, code: 400, message: "No OTP request found for this email. Please sign up first." };
      }
      if (latest.validated) {
        return { status: false, code: 400, message: "Email already verified. Please complete your registration." };
      }
    } else {
      // Same non-disclosure rule as forgotPassword: never reveal whether the email exists
      const merchant = await Merchant.findOne({ where: { email, isActive: true } });
      if (!merchant || !latest) {
        return { status: true, code: 200, message: "If the email exists, a new reset code has been sent" };
      }
    }

    const secondsSinceLast = (Date.now() - latest.createdAt.getTime()) / 1000;
    if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS) {
      const retryAfter = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast);
      return {
        status: false,
        code: 429,
        message: `Please wait ${retryAfter} second${retryAfter === 1 ? "" : "s"} before requesting a new code.`,
      };
    }

    const otp = generateOTP(4);
    await MerchantVerificationService.setSession({
      otp,
      sessionId: generateUUID(),
      email,
      path: purpose,
      name: latest.name || undefined,
    });

    const emailData = {
      otpDigits: splitOTPDigits(otp),
      browserName: req.headers["user-agent"]?.split(" ")[0] || "Unknown",
      deviceOS: req.headers["user-agent"] || "Unknown",
      requestDate: new Date().toLocaleDateString(),
      ipAddress: req.ip || req.socket.remoteAddress,
      expiresInMinutes: otpExpiration,
    };

    try {
      if (purpose === "signup") {
        await EmailService.sendSignupOtpEmail(email, emailData);
      } else {
        await EmailService.sendResetPasswordOtpEmail(email, emailData);
      }
    } catch (error: any) {
      if (isProduction) {
        throw error;
      }
    }

    return {
      status: true,
      code: 200,
      message: purpose === "signup" ? "A new OTP has been sent to your email." : "If the email exists, a new reset code has been sent",
      data: isProduction ? null : { otp }, // Show OTP in development only
    };
  }

  static async verifyOtp(data: VerifyOtpDTO): Promise<ApiResponse> {
    const { email, otp } = data;

    // Get active session for this email
    const session = await MerchantVerificationService.getSessionByEmail(email, "signup");
    
    if (!session) {
      return {
        status: false,
        code: 400,
        message: "No OTP request found for this email",
      };
    }

    // Validate OTP (this marks it as validated in DB)
    const isValid = await MerchantVerificationService.validateOTP(session.sessionId, otp);
    if (!isValid) {
      return {
        status: false,
        code: 400,
        message: "Invalid or expired OTP",
      };
    }

    return {
      status: true,
      code: 200,
      message: "OTP verified successfully. You can now complete your registration.",
      data: null,
    };
  }

  static async completeSignup(data: CompleteSignupDTO): Promise<ApiResponse> {
    const { email, businessName, phoneNumber, phoneCountryCode, password, licenseUrl } = data;

    // Check if merchant already exists FIRST
    const existingMerchant = await Merchant.findOne({ where: { email } });
    if (existingMerchant) {
      return {
        status: false,
        code: 400,
        message: "Email already registered. Please login instead.",
      };
    }

    if (await isPhoneNumberTaken(phoneCountryCode, phoneNumber)) {
      return {
        status: false,
        code: 400,
        message: PHONE_TAKEN_MESSAGE,
      };
    }

    // Then check if OTP was verified for this email
    const session = await MerchantVerificationService.getSessionByEmail(email, "signup");
    
    if (!session || !session.validated) {
      return {
        status: false,
        code: 400,
        message: "Please verify your OTP first",
      };
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create merchant - firstName and lastName will be filled in settings
    const merchant = await Merchant.create({
      email,
      firstName: "",
      lastName: "",
      phoneNumber,
      ...(phoneCountryCode ? { phoneCountryCode } : {}),
      password: hashedPassword,
      isVerified: true,
      isActive: true,
    });

    // Create store details
    await StoreDetails.create({
      merchantId: merchant.id,
      businessName,
      licenseUrl: licenseUrl || "",
    });

    // Create default payment details (empty, to be filled in onboarding)
    await PaymentDetails.create({
      merchantId: merchant.id,
    });

    // Create default merchant settings
    await MerchantSettings.create({
      merchantId: merchant.id,
    });

    // Create wallet
    await Wallet.create({ merchantId: merchant.id });

    // Assign Free plan subscription
    const freePlan = await Plan.findOne({ where: { name: PlanTier.FREE } });
    if (freePlan) {
      await Subscription.create({
        merchantId: merchant.id,
        planId: freePlan.id,
        status: SubscriptionStatus.ACTIVE,
        autoRenew: false,
      });
    }

    // Delete session after successful signup
    await MerchantVerificationService.delSession(session.sessionId);

    return {
      status: true,
      code: 201,
      message: "Merchant registered successfully. Please login to continue.",
      data: {
        merchant: {
          id: merchant.id,
          email: merchant.email,
          firstName: merchant.firstName,
          lastName: merchant.lastName,
          phoneNumber: merchant.phoneNumber,
          isVerified: merchant.isVerified,
        },
      },
    };
  }

  static async login(data: LoginDTO, req?: Request): Promise<ApiResponse> {
    const { email, password } = data;

    // First, check if email exists (without checking isActive)
    const merchant = await Merchant.findOne({
      where: { email },
      include: [
        { model: StoreDetails, as: "storeDetails" },
        { model: PaymentDetails, as: "paymentDetails" },
        { model: MerchantSettings, as: "settings" },
      ],
    });

    // Check if email exists
    if (!merchant) {
      return {
        status: false,
        code: 404,
        message: "Email not found. Please check your email address or sign up.",
      };
    }

    // Check if account is active
    if (!merchant.isActive) {
      return {
        status: false,
        code: 403,
        message: "Your account has been deactivated. Please contact support.",
      };
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, merchant.password);
    if (!isPasswordValid) {
      return {
        status: false,
        code: 401,
        message: "Invalid password. Please check your password and try again.",
      };
    }

    // Generate access token
    const token = generateToken(
      {
        id: merchant.id,
        email: merchant.email,
        type: "merchant",
      },
      {
        secret: applicationConfig.jwt.secret,
        expiresIn: applicationConfig.jwt.expiresIn,
        otpExpiration: applicationConfig.otpExpiration,
      }
    );

    // Generate refresh token
    const deviceInfo = (req as any)?.headers?.["user-agent"] || "Unknown";
    const ipAddress = (req as any)?.ip || (req as any)?.connection?.remoteAddress || "Unknown";
    const { refreshToken } = await RefreshTokenService.createRefreshToken(
      merchant.id,
      deviceInfo,
      ipAddress
    );

    return {
      status: true,
      code: 200,
      message: "Login successful",
      data: {
        token,
        refreshToken,
        merchant: {
          id: merchant.id,
          email: merchant.email,
          firstName: merchant.firstName,
          lastName: merchant.lastName,
          fullName: merchant.fullName,
          businessName: merchant.storeDetails?.businessName,
          phoneNumber: merchant.phoneNumber,
          isVerified: merchant.isVerified,
        },
        onboarding: {
          completed: merchant.onboardingCompleted,
          currentStep: merchant.onboardingStep,
          progress: {
            validId: !!merchant.validIdUrl,
            profile: !!merchant.profilePictureUrl,
            bank: merchant.paymentDetails?.bankVerified || false,
            address: merchant.storeDetails?.latitude != null && merchant.storeDetails?.longitude != null,
          },
        },
      },
    };
  }

  static async forgotPassword(data: ForgotPasswordDTO, req: Request): Promise<ApiResponse> {
    const { email } = data;

    // Check if merchant exists
    const merchant = await Merchant.findOne({ where: { email, isActive: true } });
    if (!merchant) {
      // Don't reveal if email exists or not for security
      return {
        status: true,
        code: 200,
        message: "If the email exists, a reset code has been sent",
      };
    }

    // Generate OTP
    const otp = generateOTP(4);
    const sessionId = generateUUID();

    // Store OTP in database
    await MerchantVerificationService.setSession({
      otp,
      sessionId,
      email,
      path: "reset-password",
    });

    // Prepare email data
    const emailData = {
      otpDigits: splitOTPDigits(otp),
      browserName: req.headers["user-agent"]?.split(" ")[0] || "Unknown",
      deviceOS: req.headers["user-agent"] || "Unknown",
      requestDate: new Date().toLocaleDateString(),
      ipAddress: req.ip || req.socket.remoteAddress,
      expiresInMinutes: otpExpiration,
    };

    try {
      await EmailService.sendResetPasswordOtpEmail(email, emailData);
    } catch (error: any) {
      if (isProduction) {
        throw error;
      }
    }

    return {
      status: true,
      code: 200,
      message: "If the email exists, a reset code has been sent",
      data: isProduction ? null : { otp }, // Show OTP in development only
    };
  }

  static async verifyResetOtp(data: VerifyOtpDTO): Promise<ApiResponse> {
    const { email, otp } = data;

    // Get active session for this email
    const session = await MerchantVerificationService.getSessionByEmail(email, "reset-password");
    
    if (!session) {
      return {
        status: false,
        code: 400,
        message: "No password reset request found for this email",
      };
    }

    // Validate OTP (this marks it as validated in DB)
    const isValid = await MerchantVerificationService.validateOTP(session.sessionId, otp);
    if (!isValid) {
      return {
        status: false,
        code: 400,
        message: "Invalid or expired OTP",
      };
    }

    return {
      status: true,
      code: 200,
      message: "OTP verified successfully. You can now reset your password.",
      data: null,
    };
  }

  static async resetPassword(data: ResetPasswordDTO): Promise<ApiResponse> {
    const { email, newPassword } = data;

    // Check if OTP was verified for this email
    const session = await MerchantVerificationService.getSessionByEmail(email, "reset-password");
    
    if (!session || !session.validated) {
      return {
        status: false,
        code: 400,
        message: "Please verify your OTP first",
      };
    }

    // Find merchant
    const merchant = await Merchant.findOne({ where: { email, isActive: true } });
    if (!merchant) {
      return {
        status: false,
        code: 404,
        message: "Merchant not found",
      };
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    merchant.password = hashedPassword;
    await merchant.save();

    // Delete session after successful reset
    await MerchantVerificationService.delSession(session.sessionId);

    return {
      status: true,
      code: 200,
      message: "Password reset successfully",
    };
  }
}
