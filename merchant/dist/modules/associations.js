"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshToken = exports.Category = exports.Discount = exports.Product = exports.MerchantVerification = exports.MerchantSettings = exports.PaymentDetails = exports.StoreDetails = exports.Merchant = exports.setupAssociations = void 0;
const Merchant_model_1 = require("./merchant/Merchant.model");
Object.defineProperty(exports, "Merchant", { enumerable: true, get: function () { return Merchant_model_1.Merchant; } });
const StoreDetails_model_1 = require("./store_details/StoreDetails.model");
Object.defineProperty(exports, "StoreDetails", { enumerable: true, get: function () { return StoreDetails_model_1.StoreDetails; } });
const PaymentDetails_model_1 = require("./payment_details/PaymentDetails.model");
Object.defineProperty(exports, "PaymentDetails", { enumerable: true, get: function () { return PaymentDetails_model_1.PaymentDetails; } });
const MerchantSettings_model_1 = require("./merchant_settings/MerchantSettings.model");
Object.defineProperty(exports, "MerchantSettings", { enumerable: true, get: function () { return MerchantSettings_model_1.MerchantSettings; } });
const MerchantVerification_model_1 = require("./merchant_verification/MerchantVerification.model");
Object.defineProperty(exports, "MerchantVerification", { enumerable: true, get: function () { return MerchantVerification_model_1.MerchantVerification; } });
const Product_model_1 = require("./products/Product.model");
Object.defineProperty(exports, "Product", { enumerable: true, get: function () { return Product_model_1.Product; } });
const Discount_model_1 = require("./discounts/Discount.model");
Object.defineProperty(exports, "Discount", { enumerable: true, get: function () { return Discount_model_1.Discount; } });
const Category_model_1 = require("./categories/Category.model");
Object.defineProperty(exports, "Category", { enumerable: true, get: function () { return Category_model_1.Category; } });
const RefreshToken_model_1 = require("./refresh_tokens/RefreshToken.model");
Object.defineProperty(exports, "RefreshToken", { enumerable: true, get: function () { return RefreshToken_model_1.RefreshToken; } });
/**
 * Setup all Sequelize model associations
 * Call this after models are registered with Sequelize
 *
 * Note: All associations are now defined via decorators in the models themselves.
 * This function is kept for potential future complex associations.
 */
const setupAssociations = () => {
    console.log("✅ Model associations established (via decorators)");
};
exports.setupAssociations = setupAssociations;
