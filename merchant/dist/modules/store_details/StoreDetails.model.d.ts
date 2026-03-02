import { Model } from "sequelize-typescript";
import { Merchant } from "../merchant/Merchant.model";
export declare class StoreDetails extends Model<StoreDetails> {
    merchantId: string;
    merchant: Merchant;
    businessName: string;
    businessUrl: string;
    licenseUrl: string;
    businessAddress: string;
    city: string;
    state: string;
    landmark: string;
    storeBannerUrl: string;
    storeDescription: string;
    openHour: string;
    closeHour: string;
    vacation: boolean;
    vacationStartDate: Date;
    vacationEndDate: Date;
}
//# sourceMappingURL=StoreDetails.model.d.ts.map