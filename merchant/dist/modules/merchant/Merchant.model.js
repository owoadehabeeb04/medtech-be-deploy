"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Merchant = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const StoreDetails_model_1 = require("../store_details/StoreDetails.model");
const PaymentDetails_model_1 = require("../payment_details/PaymentDetails.model");
const MerchantSettings_model_1 = require("../merchant_settings/MerchantSettings.model");
const Product_model_1 = require("../products/Product.model");
const Discount_model_1 = require("../discounts/Discount.model");
const Category_model_1 = require("../categories/Category.model");
const RefreshToken_model_1 = require("../refresh_tokens/RefreshToken.model");
let Merchant = class Merchant extends sequelize_typescript_1.Model {
    // Computed property for full name
    get fullName() {
        return `${this.firstName} ${this.lastName}`;
    }
};
exports.Merchant = Merchant;
__decorate([
    sequelize_typescript_1.PrimaryKey,
    (0, sequelize_typescript_1.Default)(sequelize_typescript_1.DataType.UUIDV4),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)
], Merchant.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    sequelize_typescript_1.Unique,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)
], Merchant.prototype, "email", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)
], Merchant.prototype, "firstName", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)
], Merchant.prototype, "lastName", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)
], Merchant.prototype, "phoneNumber", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)("+234"),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)
], Merchant.prototype, "phoneCountryCode", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)
], Merchant.prototype, "password", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)
], Merchant.prototype, "profilePictureUrl", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)
], Merchant.prototype, "isVerified", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)
], Merchant.prototype, "isActive", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)
], Merchant.prototype, "termsAccepted", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)
], Merchant.prototype, "validIdUrl", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)
], Merchant.prototype, "onboardingCompleted", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)(1),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)
], Merchant.prototype, "onboardingStep", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE)
], Merchant.prototype, "onboardingCompletedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.HasOne)(() => StoreDetails_model_1.StoreDetails)
], Merchant.prototype, "storeDetails", void 0);
__decorate([
    (0, sequelize_typescript_1.HasOne)(() => PaymentDetails_model_1.PaymentDetails)
], Merchant.prototype, "paymentDetails", void 0);
__decorate([
    (0, sequelize_typescript_1.HasOne)(() => MerchantSettings_model_1.MerchantSettings)
], Merchant.prototype, "settings", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Product_model_1.Product)
], Merchant.prototype, "products", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Discount_model_1.Discount)
], Merchant.prototype, "discounts", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Category_model_1.Category)
], Merchant.prototype, "categories", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => RefreshToken_model_1.RefreshToken)
], Merchant.prototype, "refreshTokens", void 0);
exports.Merchant = Merchant = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "merchants",
        timestamps: true,
    })
], Merchant);
