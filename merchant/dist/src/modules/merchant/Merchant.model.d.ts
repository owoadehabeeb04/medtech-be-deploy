import { Model } from "sequelize-typescript";
import { StoreDetails } from "../store_details/StoreDetails.model";
import { PaymentDetails } from "../payment_details/PaymentDetails.model";
import { MerchantSettings } from "../merchant_settings/MerchantSettings.model";
import { Product } from "../products/Product.model";
import { Discount } from "../discounts/Discount.model";
import { Category } from "../categories/Category.model";
import { RefreshToken } from "../refresh_tokens/RefreshToken.model";
export declare class Merchant extends Model<Merchant> {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    phoneCountryCode: string;
    password: string;
    profilePictureUrl: string;
    isVerified: boolean;
    isActive: boolean;
    termsAccepted: boolean;
    validIdUrl: string;
    onboardingCompleted: boolean;
    onboardingStep: number;
    onboardingCompletedAt: Date;
    storeDetails: StoreDetails;
    paymentDetails: PaymentDetails;
    settings: MerchantSettings;
    products: Product[];
    discounts: Discount[];
    categories: Category[];
    refreshTokens: RefreshToken[];
    get fullName(): string;
}
//# sourceMappingURL=Merchant.model.d.ts.map