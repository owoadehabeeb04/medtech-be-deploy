import { Merchant } from "../merchant/Merchant.model";
import { PaymentDetails } from "../payment_details/PaymentDetails.model";
import { AcceptTermsDTO, VerifyBankDTO, OnboardingStatusDTO } from "./MerchantOnboarding.dto";
import { PaystackService } from "../../service/Paystack/Paystack.service";
import { UploadService } from "../upload/Upload.service";
import { ApiResponse } from "../merchant_auth/MerchantAuth.service";

export class MerchantOnboardingService {
  /**
   * Get current onboarding status
   */
  static async getOnboardingStatus(merchantId: string): Promise<ApiResponse> {
    try {
      const merchant = await Merchant.findByPk(merchantId, {
        include: [
          { model: PaymentDetails, as: "paymentDetails" },
        ],
      });

      if (!merchant) {
        return {
          status: false,
          code: 404,
          message: "Merchant not found",
        };
      }

      const statusData: OnboardingStatusDTO = {
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
            completed: merchant.paymentDetails?.bankVerified || false,
            required: true,
            verified: merchant.paymentDetails?.bankVerified || false,
          },
        },
      };

      return {
        status: true,
        code: 200,
        message: "Onboarding status retrieved successfully",
        data: statusData,
      };
    } catch (error: any) {
      return {
        status: false,
        code: 500,
        message: error.message || "Failed to retrieve onboarding status",
      };
    }
  }

  /**
   * Step 1: Accept terms and conditions
   */
  static async acceptTerms(merchantId: string, data: AcceptTermsDTO): Promise<ApiResponse> {
    try {
      const merchant = await Merchant.findByPk(merchantId);

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

      await merchant.update({
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
    } catch (error: any) {
      return {
        status: false,
        code: 500,
        message: error.message || "Failed to accept terms",
      };
    }
  }

  /**
   * Step 2: Upload valid ID document
   */
  static async uploadValidId(merchantId: string, validIdUrl: string): Promise<ApiResponse> {
    try {
      const merchant = await Merchant.findByPk(merchantId);

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

      await merchant.update({
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
    } catch (error: any) {
      return {
        status: false,
        code: 500,
        message: error.message || "Failed to upload valid ID",
      };
    }
  }

  /**
   * Step 3: Upload profile picture
   */
  static async uploadProfilePicture(
    merchantId: string,
    profilePictureUrl: string
  ): Promise<ApiResponse> {
    try {
      const merchant = await Merchant.findByPk(merchantId);

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

      await merchant.update({
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
    } catch (error: any) {
      return {
        status: false,
        code: 500,
        message: error.message || "Failed to upload profile picture",
      };
    }
  }

  /**
   * Step 4: Verify bank account
   */
  static async verifyBankAccount(merchantId: string, data: VerifyBankDTO): Promise<ApiResponse> {
    try {
      const merchant = await Merchant.findByPk(merchantId, {
        include: [
          { model: PaymentDetails, as: "paymentDetails" },
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

      if (merchant.paymentDetails?.bankVerified) {
        return {
          status: false,
          code: 400,
          message: "Bank account already verified",
        };
      }

      // Verify with Paystack
      const verificationResult = await PaystackService.verifyBankAccount(
        data.accountNumber,
        data.bankCode
      );

      if (!verificationResult.verified) {
        return {
          status: false,
          code: 400,
          message: "Unable to verify bank account",
        };
      }

      // Compare names
      const namesMatch = PaystackService.compareNames(
        data.accountName,
        verificationResult.accountName
      );

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
      const banks = await PaystackService.getBankList();
      const bank = banks.find((b) => b.code === data.bankCode);

      // Update or create payment details
      if (merchant.paymentDetails) {
        await merchant.paymentDetails.update({
          bankName: bank?.name || data.bankCode,
          bankCode: data.bankCode,
          bankAccountNumber: data.accountNumber,
          bankAccountName: verificationResult.accountName,
          bankVerified: true,
          verifiedAt: new Date(),
        });
      } else {
        await PaymentDetails.create({
          merchantId: merchant.id,
          bankName: bank?.name || data.bankCode,
          bankCode: data.bankCode,
          bankAccountNumber: data.accountNumber,
          bankAccountName: verificationResult.accountName,
          bankVerified: true,
          verifiedAt: new Date(),
        });
      }

      // Mark onboarding as complete
      await merchant.update({
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
          bankName: bank?.name || data.bankCode,
          onboardingCompleted: true,
        },
      };
    } catch (error: any) {
      return {
        status: false,
        code: 500,
        message: error.message || "Failed to verify bank account",
      };
    }
  }
}
