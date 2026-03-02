import { AcceptTermsDTO, VerifyBankDTO } from "./MerchantOnboarding.dto";
import { ApiResponse } from "../merchant_auth/MerchantAuth.service";
export declare class MerchantOnboardingService {
    /**
     * Get current onboarding status
     */
    static getOnboardingStatus(merchantId: string): Promise<ApiResponse>;
    /**
     * Step 1: Accept terms and conditions
     */
    static acceptTerms(merchantId: string, data: AcceptTermsDTO): Promise<ApiResponse>;
    /**
     * Step 2: Upload valid ID document
     */
    static uploadValidId(merchantId: string, validIdUrl: string): Promise<ApiResponse>;
    /**
     * Step 3: Upload profile picture
     */
    static uploadProfilePicture(merchantId: string, profilePictureUrl: string): Promise<ApiResponse>;
    /**
     * Step 4: Verify bank account
     */
    static verifyBankAccount(merchantId: string, data: VerifyBankDTO): Promise<ApiResponse>;
}
//# sourceMappingURL=MerchantOnboarding.service.d.ts.map