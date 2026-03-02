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
exports.MerchantOnboardingService = void 0;
const Merchant_model_1 = require("../merchant/Merchant.model");
const PaymentDetails_model_1 = require("../payment_details/PaymentDetails.model");
const Paystack_service_1 = require("../../service/Paystack/Paystack.service");
class MerchantOnboardingService {
    /**
     * Get current onboarding status
     */
    static getOnboardingStatus(merchantId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const merchant = yield Merchant_model_1.Merchant.findByPk(merchantId, {
                    include: [
                        { model: PaymentDetails_model_1.PaymentDetails, as: "paymentDetails" },
                    ],
                });
                if (!merchant) {
                    return {
                        status: false,
                        code: 404,
                        message: "Merchant not found",
                    };
                }
                const statusData = {
                    completed: merchant.onboardingCompleted,
                    currentStep: merchant.onboardingStep,
                    steps: {
                        terms: {
                            completed: merchant.termsAccepted,
                            required: true,
                        },
                        validId: {
                            completed: !!merchant.validIdUrl,
                            required: true,
                            url: merchant.validIdUrl || undefined,
                        },
                        profile: {
                            completed: !!merchant.profilePictureUrl,
                            required: true,
                            url: merchant.profilePictureUrl || undefined,
                        },
                        bank: {
                            completed: ((_a = merchant.paymentDetails) === null || _a === void 0 ? void 0 : _a.bankVerified) || false,
                            required: true,
                            verified: ((_b = merchant.paymentDetails) === null || _b === void 0 ? void 0 : _b.bankVerified) || false,
                        },
                    },
                };
                return {
                    status: true,
                    code: 200,
                    message: "Onboarding status retrieved successfully",
                    data: statusData,
                };
            }
            catch (error) {
                return {
                    status: false,
                    code: 500,
                    message: error.message || "Failed to retrieve onboarding status",
                };
            }
        });
    }
    /**
     * Step 1: Accept terms and conditions
     */
    static acceptTerms(merchantId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const merchant = yield Merchant_model_1.Merchant.findByPk(merchantId);
                if (!merchant) {
                    return {
                        status: false,
                        code: 404,
                        message: "Merchant not found",
                    };
                }
                if (merchant.termsAccepted) {
                    return {
                        status: false,
                        code: 400,
                        message: "Terms already accepted",
                    };
                }
                yield merchant.update({
                    termsAccepted: true,
                    onboardingStep: merchant.onboardingStep === 1 ? 2 : merchant.onboardingStep,
                });
                return {
                    status: true,
                    code: 200,
                    message: "Terms and conditions accepted successfully",
                    data: {
                        currentStep: merchant.onboardingStep,
                        nextStep: "Upload Valid ID",
                    },
                };
            }
            catch (error) {
                return {
                    status: false,
                    code: 500,
                    message: error.message || "Failed to accept terms",
                };
            }
        });
    }
    /**
     * Step 2: Upload valid ID document
     */
    static uploadValidId(merchantId, validIdUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const merchant = yield Merchant_model_1.Merchant.findByPk(merchantId);
                if (!merchant) {
                    return {
                        status: false,
                        code: 404,
                        message: "Merchant not found",
                    };
                }
                if (!merchant.termsAccepted) {
                    return {
                        status: false,
                        code: 400,
                        message: "Please accept terms and conditions first",
                    };
                }
                if (merchant.validIdUrl) {
                    return {
                        status: false,
                        code: 400,
                        message: "Valid ID already uploaded. Contact support to update.",
                    };
                }
                yield merchant.update({
                    validIdUrl: validIdUrl,
                    onboardingStep: merchant.onboardingStep === 2 ? 3 : merchant.onboardingStep,
                });
                return {
                    status: true,
                    code: 200,
                    message: "Valid ID uploaded successfully",
                    data: {
                        validIdUrl: validIdUrl,
                        currentStep: merchant.onboardingStep,
                        nextStep: "Upload Profile Picture",
                    },
                };
            }
            catch (error) {
                return {
                    status: false,
                    code: 500,
                    message: error.message || "Failed to upload valid ID",
                };
            }
        });
    }
    /**
     * Step 3: Upload profile picture
     */
    static uploadProfilePicture(merchantId, profilePictureUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const merchant = yield Merchant_model_1.Merchant.findByPk(merchantId);
                if (!merchant) {
                    return {
                        status: false,
                        code: 404,
                        message: "Merchant not found",
                    };
                }
                if (!merchant.validIdUrl) {
                    return {
                        status: false,
                        code: 400,
                        message: "Please upload valid ID first",
                    };
                }
                if (merchant.profilePictureUrl) {
                    return {
                        status: false,
                        code: 400,
                        message: "Profile picture already uploaded. Contact support to update.",
                    };
                }
                yield merchant.update({
                    profilePictureUrl: profilePictureUrl,
                    onboardingStep: merchant.onboardingStep === 3 ? 4 : merchant.onboardingStep,
                });
                return {
                    status: true,
                    code: 200,
                    message: "Profile picture uploaded successfully",
                    data: {
                        profilePictureUrl: profilePictureUrl,
                        currentStep: merchant.onboardingStep,
                        nextStep: "Verify Bank Account",
                    },
                };
            }
            catch (error) {
                return {
                    status: false,
                    code: 500,
                    message: error.message || "Failed to upload profile picture",
                };
            }
        });
    }
    /**
     * Step 4: Verify bank account
     */
    static verifyBankAccount(merchantId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const merchant = yield Merchant_model_1.Merchant.findByPk(merchantId, {
                    include: [
                        { model: PaymentDetails_model_1.PaymentDetails, as: "paymentDetails" },
                    ],
                });
                if (!merchant) {
                    return {
                        status: false,
                        code: 404,
                        message: "Merchant not found",
                    };
                }
                if (!merchant.profilePictureUrl) {
                    return {
                        status: false,
                        code: 400,
                        message: "Please upload profile picture first",
                    };
                }
                if ((_a = merchant.paymentDetails) === null || _a === void 0 ? void 0 : _a.bankVerified) {
                    return {
                        status: false,
                        code: 400,
                        message: "Bank account already verified",
                    };
                }
                // Verify with Paystack
                const verificationResult = yield Paystack_service_1.PaystackService.verifyBankAccount(data.accountNumber, data.bankCode);
                if (!verificationResult.verified) {
                    return {
                        status: false,
                        code: 400,
                        message: "Unable to verify bank account",
                    };
                }
                // Compare names
                const namesMatch = Paystack_service_1.PaystackService.compareNames(data.accountName, verificationResult.accountName);
                if (!namesMatch) {
                    return {
                        status: false,
                        code: 400,
                        message: `Account name mismatch. Expected: "${verificationResult.accountName}"`,
                        data: {
                            providedName: data.accountName,
                            actualName: verificationResult.accountName,
                            hint: "Use the actualName value exactly as shown",
                        },
                    };
                }
                // Get bank name from bank code
                const banks = yield Paystack_service_1.PaystackService.getBankList();
                const bank = banks.find((b) => b.code === data.bankCode);
                // Update or create payment details
                if (merchant.paymentDetails) {
                    yield merchant.paymentDetails.update({
                        bankName: (bank === null || bank === void 0 ? void 0 : bank.name) || data.bankCode,
                        bankCode: data.bankCode,
                        bankAccountNumber: data.accountNumber,
                        bankAccountName: verificationResult.accountName,
                        bankVerified: true,
                        verifiedAt: new Date(),
                    });
                }
                else {
                    yield PaymentDetails_model_1.PaymentDetails.create({
                        merchantId: merchant.id,
                        bankName: (bank === null || bank === void 0 ? void 0 : bank.name) || data.bankCode,
                        bankCode: data.bankCode,
                        bankAccountNumber: data.accountNumber,
                        bankAccountName: verificationResult.accountName,
                        bankVerified: true,
                        verifiedAt: new Date(),
                    });
                }
                // Mark onboarding as complete
                yield merchant.update({
                    onboardingCompleted: true,
                    onboardingCompletedAt: new Date(),
                });
                return {
                    status: true,
                    code: 200,
                    message: "Bank account verified successfully. Onboarding completed!",
                    data: {
                        verified: true,
                        accountName: verificationResult.accountName,
                        bankName: (bank === null || bank === void 0 ? void 0 : bank.name) || data.bankCode,
                        onboardingCompleted: true,
                    },
                };
            }
            catch (error) {
                return {
                    status: false,
                    code: 500,
                    message: error.message || "Failed to verify bank account",
                };
            }
        });
    }
}
exports.MerchantOnboardingService = MerchantOnboardingService;
