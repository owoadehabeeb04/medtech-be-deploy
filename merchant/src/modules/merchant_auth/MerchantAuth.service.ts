import { Request } from "express";
import { Merchant } from "../merchant/Merchant.model";
import { StoreDetails } from "../store_details/StoreDetails.model";
import { PaymentDetails } from "../payment_details/PaymentDetails.model";
import { MerchantSettings } from "../merchant_settings/MerchantSettings.model";
import { Category } from "../categories/Category.model";
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

const { isProduction } = applicationConfig;

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
    const { email, businessName, phoneNumber, password, licenseUrl } = data;

    // Check if merchant already exists FIRST
    const existingMerchant = await Merchant.findOne({ where: { email } });
    if (existingMerchant) {
      return {
        status: false,
        code: 400,
        message: "Email already registered. Please login instead.",
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

    // Seed default categories (Antibiotics, Pain Relief)
    await Category.seedDefaultCategories(merchant.id);

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
            terms: merchant.termsAccepted,
            validId: !!merchant.validIdUrl,
            profile: !!merchant.profilePictureUrl,
            bank: merchant.paymentDetails?.bankVerified || false,
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
