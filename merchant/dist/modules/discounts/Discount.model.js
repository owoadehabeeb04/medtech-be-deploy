"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Discount = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const Merchant_model_1 = require("../merchant/Merchant.model");
const enums_1 = require("../../constants/enums");
let Discount = class Discount extends sequelize_typescript_1.Model {
    // Computed Properties
    get isExpired() {
        const now = new Date();
        return now > this.endDate || now < this.startDate;
    }
    get isValid() {
        return (this.status === enums_1.DiscountStatus.ACTIVE &&
            !this.isExpired &&
            (this.usageLimit === null || this.usageCount < this.usageLimit));
    }
    get remainingUses() {
        if (this.usageLimit === null)
            return null;
        return Math.max(0, this.usageLimit - this.usageCount);
    }
};
exports.Discount = Discount;
__decorate([
    sequelize_typescript_1.PrimaryKey,
    (0, sequelize_typescript_1.Default)(sequelize_typescript_1.DataType.UUIDV4),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)
], Discount.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Merchant_model_1.Merchant),
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)
], Discount.prototype, "merchantId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Merchant_model_1.Merchant)
], Discount.prototype, "merchant", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    sequelize_typescript_1.Index,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(50))
], Discount.prototype, "code", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.ENUM(...Object.values(enums_1.DiscountType)))
], Discount.prototype, "type", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DECIMAL(10, 2))
], Discount.prototype, "amount", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)
], Discount.prototype, "applyToAllProducts", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.JSONB)
], Discount.prototype, "applicableProducts", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.JSONB)
], Discount.prototype, "applicableCategories", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DECIMAL(10, 2))
], Discount.prototype, "minOrderAmount", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)(enums_1.DiscountStatus.ACTIVE),
    sequelize_typescript_1.Index,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.ENUM(...Object.values(enums_1.DiscountStatus)))
], Discount.prototype, "status", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    sequelize_typescript_1.Index,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATEONLY)
], Discount.prototype, "startDate", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    sequelize_typescript_1.Index,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATEONLY)
], Discount.prototype, "endDate", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)
], Discount.prototype, "usageLimit", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)(0),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)
], Discount.prototype, "usageCount", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)
], Discount.prototype, "perUserLimit", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt
], Discount.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt
], Discount.prototype, "updatedAt", void 0);
__decorate([
    sequelize_typescript_1.DeletedAt
], Discount.prototype, "deletedAt", void 0);
exports.Discount = Discount = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "discounts",
        timestamps: true,
        paranoid: true, // Enable soft delete
        indexes: [
            { fields: ["merchant_id"] },
            { fields: ["code"] },
            { fields: ["status"] },
            { fields: ["start_date", "end_date"] },
            { fields: ["deleted_at"] },
            { unique: true, fields: ["merchant_id", "code"], name: "unique_merchant_code" },
        ],
    })
], Discount);
