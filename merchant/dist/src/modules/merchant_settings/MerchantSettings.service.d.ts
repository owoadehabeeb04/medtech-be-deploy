import { UpdateProfileDTO, UpdatePaymentDTO, UpdateStoreDTO, ChangePasswordDTO, UpdateNotificationsDTO, UpdatePreferencesDTO, UpdateAllSettingsDTO } from "./MerchantSettings.dto";
export interface ApiResponse {
    status: boolean;
    code: number;
    message: string;
    data?: any;
}
export declare class MerchantSettingsService {
    /**
     * Get all settings for a merchant
     */
    static getAllSettings(merchantId: string): Promise<ApiResponse>;
    /**
     * Update merchant profile (personal details)
     */
    static updateProfile(merchantId: string, data: UpdateProfileDTO): Promise<ApiResponse>;
    /**
     * Update payment details with Paystack verification
     */
    static updatePayment(merchantId: string, data: UpdatePaymentDTO): Promise<ApiResponse>;
    /**
     * Update store details
     */
    static updateStore(merchantId: string, data: UpdateStoreDTO): Promise<ApiResponse>;
    /**
     * Change password
     */
    static changePassword(merchantId: string, data: ChangePasswordDTO): Promise<ApiResponse>;
    /**
     * Update notification settings (toggle-based, instant save)
     */
    static updateNotifications(merchantId: string, data: UpdateNotificationsDTO): Promise<ApiResponse>;
    /**
     * Update store preferences (toggle-based with save button)
     */
    static updatePreferences(merchantId: string, data: UpdatePreferencesDTO): Promise<ApiResponse>;
    /**
     * Update all settings at once (unified endpoint for UI)
     */
    static updateAllSettings(merchantId: string, data: UpdateAllSettingsDTO): Promise<ApiResponse>;
}
//# sourceMappingURL=MerchantSettings.service.d.ts.map