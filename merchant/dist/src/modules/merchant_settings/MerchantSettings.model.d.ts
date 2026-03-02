import { Model } from "sequelize-typescript";
import { Merchant } from "../merchant/Merchant.model";
export declare class MerchantSettings extends Model<MerchantSettings> {
    id: string;
    merchantId: string;
    merchant: Merchant;
    pushNotificationsEnabled: boolean;
    emailNotificationsEnabled: boolean;
    notificationPreferences: {
        orderPlaced: {
            email: boolean;
            sms: boolean;
            desktop: boolean;
        };
        lowStock: {
            email: boolean;
            sms: boolean;
            desktop: boolean;
        };
        payoutAlert: {
            email: boolean;
            sms: boolean;
            desktop: boolean;
        };
        supportTicket: {
            email: boolean;
            sms: boolean;
            desktop: boolean;
        };
    };
    storePreferences: {
        acceptOrdersAutomatically: boolean;
        requireManualApprovalForPrescriptions: boolean;
        allowOutOfStockAlternatives: boolean;
        autoHideOutOfStock: boolean;
        enablePharmacyPickup: boolean;
        enableInHouseDelivery: boolean;
        deliveryRadius: number | null;
        deliveryFeeType: "flat" | "distance-based";
        deliveryFlatFee: number | null;
        deliveryPricePerKm: number | null;
        deliveryStartTime: string | null;
        deliveryEndTime: string | null;
        lowStockThreshold: number;
        showLowStockLabel: boolean;
    };
}
//# sourceMappingURL=MerchantSettings.model.d.ts.map