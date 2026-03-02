"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantSettings = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const Merchant_model_1 = require("../merchant/Merchant.model");
let MerchantSettings = class MerchantSettings extends sequelize_typescript_1.Model {
};
exports.MerchantSettings = MerchantSettings;
__decorate([
    sequelize_typescript_1.PrimaryKey,
    (0, sequelize_typescript_1.Default)(sequelize_typescript_1.DataType.UUIDV4),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)
], MerchantSettings.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Merchant_model_1.Merchant),
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)
], MerchantSettings.prototype, "merchantId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Merchant_model_1.Merchant)
], MerchantSettings.prototype, "merchant", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)
], MerchantSettings.prototype, "pushNotificationsEnabled", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)
], MerchantSettings.prototype, "emailNotificationsEnabled", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)({
        orderPlaced: { email: false, sms: false, desktop: true },
        lowStock: { email: false, sms: false, desktop: true },
        payoutAlert: { email: false, sms: false, desktop: true },
        supportTicket: { email: false, sms: false, desktop: true },
    }),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.JSONB)
], MerchantSettings.prototype, "notificationPreferences", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)({
        acceptOrdersAutomatically: true,
        requireManualApprovalForPrescriptions: false,
        allowOutOfStockAlternatives: false,
        autoHideOutOfStock: false,
        enablePharmacyPickup: true,
        enableInHouseDelivery: false,
        deliveryRadius: null,
        deliveryFeeType: "flat",
        deliveryFlatFee: null,
        deliveryPricePerKm: null,
        deliveryStartTime: null,
        deliveryEndTime: null,
        lowStockThreshold: 5,
        showLowStockLabel: false,
    }),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.JSONB)
], MerchantSettings.prototype, "storePreferences", void 0);
exports.MerchantSettings = MerchantSettings = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "merchant_settings",
        timestamps: true,
    })
], MerchantSettings);
