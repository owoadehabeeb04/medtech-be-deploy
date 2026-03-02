"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantAuthService = void 0;
const Merchant_model_1 = require("../merchant/Merchant.model");
const StoreDetails_model_1 = require("../store_details/StoreDetails.model");
const PaymentDetails_model_1 = require("../payment_details/PaymentDetails.model");
const MerchantSettings_model_1 = require("../merchant_settings/MerchantSettings.model");
const Category_model_1 = require("../categories/Category.model");
const MerchantVerification_service_1 = require("../merchant_verification/MerchantVerification.service");
const RefreshToken_service_1 = require("../refresh_tokens/RefreshToken.service");
const Email_service_1 = require("../../service/Email/Email.service");
const utils_1 = require("@medtech/utils");
const config_1 = require("../../config");
const { isProduction } = config_1.applicationConfig;
class MerchantAuthService {
    static signup(data, req) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { email, name } = data;
            // Check if merchant already exists
            const existingMerchant = yield Merchant_model_1.Merchant.findOne({ where: { email } });
            if (existingMerchant) {
                return {
                    status: false,
                    code: 400,
                    message: "Email already registered",
                };
            }
            // Generate OTP
            const otp = (0, utils_1.generateOTP)(4);
            const sessionId = (0, utils_1.generateUUID)(); // For internal tracking
            // Store OTP in database with email and name
            yield MerchantVerification_service_1.MerchantVerificationService.setSession({
                otp,
                sessionId,
                email,
                path: "signup",
                name,
            });
            // Prepare email data
            const emailData = {
                otpDigits: (0, utils_1.splitOTPDigits)(otp),
                browserName: ((_a = req.headers["user-agent"]) === null || _a === void 0 ? void 0 : _a.split(" ")[0]) || "Unknown",
                deviceOS: req.headers["user-agent"] || "Unknown",
                requestDate: new Date().toLocaleDateString(),
                ipAddress: req.ip || req.socket.remoteAddress,
            };
            try {
                yield Email_service_1.EmailService.sendSignupOtpEmail(email, emailData);
            }
            catch (error) {
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
        });
    }
    static verifyOtp(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, otp } = data;
            // Get active session for this email
            const session = yield MerchantVerification_service_1.MerchantVerificationService.getSessionByEmail(email, "signup");
            if (!session) {
                return {
                    status: false,
                    code: 400,
                    message: "No OTP request found for this email",
                };
            }
            // Validate OTP (this marks it as validated in DB)
            const isValid = yield MerchantVerification_service_1.MerchantVerificationService.validateOTP(session.sessionId, otp);
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
        });
    }
    static completeSignup(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, businessName, phoneNumber, password, licenseUrl } = data;
            // Check if merchant already exists FIRST
            const existingMerchant = yield Merchant_model_1.Merchant.findOne({ where: { email } });
            if (existingMerchant) {
                return {
                    status: false,
                    code: 400,
                    message: "Email already registered. Please login instead.",
                };
            }
            // Then check if OTP was verified for this email
            const session = yield MerchantVerification_service_1.MerchantVerificationService.getSessionByEmail(email, "signup");
            if (!session || !session.validated) {
                return {
                    status: false,
                    code: 400,
                    message: "Please verify your OTP first",
                };
            }
            // Hash password
            const hashedPassword = yield (0, utils_1.hashPassword)(password);
            // Create merchant - firstName and lastName will be filled in settings
            const merchant = yield Merchant_model_1.Merchant.create({
                email,
                firstName: "",
                lastName: "",
                phoneNumber,
                password: hashedPassword,
                isVerified: true,
                isActive: true,
            });
            // Create store details
            yield StoreDetails_model_1.StoreDetails.create({
                merchantId: merchant.id,
                businessName,
                licenseUrl: licenseUrl || "",
            });
            // Create default payment details (empty, to be filled in onboarding)
            yield PaymentDetails_model_1.PaymentDetails.create({
                merchantId: merchant.id,
            });
            // Create default merchant settings
            yield MerchantSettings_model_1.MerchantSettings.create({
                merchantId: merchant.id,
            });
            // Seed default categories (Antibiotics, Pain Relief)
            yield Category_model_1.Category.seedDefaultCategories(merchant.id);
            // Delete session after successful signup
            yield MerchantVerification_service_1.MerchantVerificationService.delSession(session.sessionId);
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
        });
    }
    static login(data, req) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const { email, password } = data;
            // First, check if email exists (without checking isActive)
            const merchant = yield Merchant_model_1.Merchant.findOne({
                where: { email },
                include: [
                    { model: StoreDetails_model_1.StoreDetails, as: "storeDetails" },
                    { model: PaymentDetails_model_1.PaymentDetails, as: "paymentDetails" },
                    { model: MerchantSettings_model_1.MerchantSettings, as: "settings" },
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
            const isPasswordValid = yield (0, utils_1.verifyPassword)(password, merchant.password);
            if (!isPasswordValid) {
                return {
                    status: false,
                    code: 401,
                    message: "Invalid password. Please check your password and try again.",
                };
            }
            // Generate access token
            const token = (0, utils_1.generateToken)({
                id: merchant.id,
                email: merchant.email,
                type: "merchant",
            }, {
                secret: config_1.applicationConfig.jwt.secret,
                expiresIn: config_1.applicationConfig.jwt.expiresIn,
                otpExpiration: config_1.applicationConfig.otpExpiration,
            });
            // Generate refresh token
            const deviceInfo = ((_a = req === null || req === void 0 ? void 0 : req.headers) === null || _a === void 0 ? void 0 : _a["user-agent"]) || "Unknown";
            const ipAddress = (req === null || req === void 0 ? void 0 : req.ip) || ((_b = req === null || req === void 0 ? void 0 : req.connection) === null || _b === void 0 ? void 0 : _b.remoteAddress) || "Unknown";
            const { refreshToken } = yield RefreshToken_service_1.RefreshTokenService.createRefreshToken(merchant.id, deviceInfo, ipAddress);
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
                        businessName: (_c = merchant.storeDetails) === null || _c === void 0 ? void 0 : _c.businessName,
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
                            bank: ((_d = merchant.paymentDetails) === null || _d === void 0 ? void 0 : _d.bankVerified) || false,
                        },
                    },
                },
            };
        });
    }
    static forgotPassword(data, req) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { email } = data;
            // Check if merchant exists
            const merchant = yield Merchant_model_1.Merchant.findOne({ where: { email, isActive: true } });
            if (!merchant) {
                // Don't reveal if email exists or not for security
                return {
                    status: true,
                    code: 200,
                    message: "If the email exists, a reset code has been sent",
                };
            }
            // Generate OTP
            const otp = (0, utils_1.generateOTP)(4);
            const sessionId = (0, utils_1.generateUUID)();
            // Store OTP in database
            yield MerchantVerification_service_1.MerchantVerificationService.setSession({
                otp,
                sessionId,
                email,
                path: "reset-password",
            });
            // Prepare email data
            const emailData = {
                otpDigits: (0, utils_1.splitOTPDigits)(otp),
                browserName: ((_a = req.headers["user-agent"]) === null || _a === void 0 ? void 0 : _a.split(" ")[0]) || "Unknown",
                deviceOS: req.headers["user-agent"] || "Unknown",
                requestDate: new Date().toLocaleDateString(),
                ipAddress: req.ip || req.socket.remoteAddress,
            };
            try {
                yield Email_service_1.EmailService.sendResetPasswordOtpEmail(email, emailData);
            }
            catch (error) {
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
        });
    }
    static verifyResetOtp(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, otp } = data;
            // Get active session for this email
            const session = yield MerchantVerification_service_1.MerchantVerificationService.getSessionByEmail(email, "reset-password");
            if (!session) {
                return {
                    status: false,
                    code: 400,
                    message: "No password reset request found for this email",
                };
            }
            // Validate OTP (this marks it as validated in DB)
            const isValid = yield MerchantVerification_service_1.MerchantVerificationService.validateOTP(session.sessionId, otp);
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
        });
    }
    static resetPassword(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, newPassword } = data;
            // Check if OTP was verified for this email
            const session = yield MerchantVerification_service_1.MerchantVerificationService.getSessionByEmail(email, "reset-password");
            if (!session || !session.validated) {
                return {
                    status: false,
                    code: 400,
                    message: "Please verify your OTP first",
                };
            }
            // Find merchant
            const merchant = yield Merchant_model_1.Merchant.findOne({ where: { email, isActive: true } });
            if (!merchant) {
                return {
                    status: false,
                    code: 404,
                    message: "Merchant not found",
                };
            }
            // Hash new password
            const hashedPassword = yield (0, utils_1.hashPassword)(newPassword);
            // Update password
            merchant.password = hashedPassword;
            yield merchant.save();
            // Delete session after successful reset
            yield MerchantVerification_service_1.MerchantVerificationService.delSession(session.sessionId);
            return {
                status: true,
                code: 200,
                message: "Password reset successfully",
            };
        });
    }
}
exports.MerchantAuthService = MerchantAuthService;
