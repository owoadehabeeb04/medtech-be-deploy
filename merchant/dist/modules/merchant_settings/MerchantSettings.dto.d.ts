export interface UpdateProfileDTO {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    phoneCountryCode?: string;
}
export interface UpdatePaymentDTO {
    bankCode: string;
    accountNumber: string;
    accountName: string;
}
export interface UpdateStoreDTO {
    businessName?: string;
    businessUrl?: string;
    businessAddress?: string;
    city?: string;
    state?: string;
    landmark?: string;
    openHour?: string;
    closeHour?: string;
    vacation?: boolean;
    vacationStartDate?: string | null;
    vacationEndDate?: string | null;
    storeDescription?: string;
    storeBannerUrl?: string;
}
export interface ChangePasswordDTO {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}
export interface UpdateNotificationsDTO {
    pushNotificationsEnabled?: boolean;
    emailNotificationsEnabled?: boolean;
    notificationPreferences?: {
        orderPlaced?: {
            email?: boolean;
            sms?: boolean;
            desktop?: boolean;
        };
        lowStock?: {
            email?: boolean;
            sms?: boolean;
            desktop?: boolean;
        };
        payoutAlert?: {
            email?: boolean;
            sms?: boolean;
            desktop?: boolean;
        };
        supportTicket?: {
            email?: boolean;
            sms?: boolean;
            desktop?: boolean;
        };
    };
}
export interface UpdatePreferencesDTO {
    storePreferences?: {
        acceptOrdersAutomatically?: boolean;
        requireManualApprovalForPrescriptions?: boolean;
        allowOutOfStockAlternatives?: boolean;
        autoHideOutOfStock?: boolean;
        enablePharmacyPickup?: boolean;
        enableInHouseDelivery?: boolean;
        deliveryRadius?: number | null;
        deliveryFeeType?: "flat" | "distance-based";
        deliveryFlatFee?: number | null;
        deliveryPricePerKm?: number | null;
        deliveryMinKm?: number | null;
        deliveryStartTime?: string | null;
        deliveryEndTime?: string | null;
        lowStockThreshold?: number;
        showLowStockLabel?: boolean;
    };
}
export interface UpdateAllSettingsDTO {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    phoneCountryCode?: string;
    businessName?: string;
    businessUrl?: string;
    businessAddress?: string;
    city?: string;
    state?: string;
    landmark?: string;
    openHour?: string;
    closeHour?: string;
    vacation?: boolean;
    vacationStartDate?: string | null;
    vacationEndDate?: string | null;
    storeDescription?: string;
    storeBannerUrl?: string;
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;
    pushNotificationsEnabled?: boolean;
    emailNotificationsEnabled?: boolean;
    notificationPreferences?: {
        orderPlaced?: {
            email?: boolean;
            sms?: boolean;
            desktop?: boolean;
        };
        lowStock?: {
            email?: boolean;
            sms?: boolean;
            desktop?: boolean;
        };
        payoutAlert?: {
            email?: boolean;
            sms?: boolean;
            desktop?: boolean;
        };
        supportTicket?: {
            email?: boolean;
            sms?: boolean;
            desktop?: boolean;
        };
    };
    storePreferences?: {
        acceptOrdersAutomatically?: boolean;
        requireManualApprovalForPrescriptions?: boolean;
        allowOutOfStockAlternatives?: boolean;
        autoHideOutOfStock?: boolean;
        enablePharmacyPickup?: boolean;
        enableInHouseDelivery?: boolean;
        deliveryRadius?: number | null;
        deliveryFeeType?: "flat" | "distance-based";
        deliveryFlatFee?: number | null;
        deliveryPricePerKm?: number | null;
        deliveryMinKm?: number | null;
        deliveryStartTime?: string | null;
        deliveryEndTime?: string | null;
        lowStockThreshold?: number;
        showLowStockLabel?: boolean;
    };
}
//# sourceMappingURL=MerchantSettings.dto.d.ts.map