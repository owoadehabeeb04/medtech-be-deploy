import { Merchant } from "./merchant/Merchant.model";
import { StoreDetails } from "./store_details/StoreDetails.model";
import { PaymentDetails } from "./payment_details/PaymentDetails.model";
import { MerchantSettings } from "./merchant_settings/MerchantSettings.model";
import { MerchantVerification } from "./merchant_verification/MerchantVerification.model";
import { Product } from "./products/Product.model";
import { Discount } from "./discounts/Discount.model";
import { Category } from "./categories/Category.model";
import { RefreshToken } from "./refresh_tokens/RefreshToken.model";
/**
 * Setup all Sequelize model associations
 * Call this after models are registered with Sequelize
 *
 * Note: All associations are now defined via decorators in the models themselves.
 * This function is kept for potential future complex associations.
 */
export declare const setupAssociations: () => void;
export { Merchant, StoreDetails, PaymentDetails, MerchantSettings, MerchantVerification, Product, Discount, Category, RefreshToken };
//# sourceMappingURL=associations.d.ts.map