"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshToken = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const Merchant_model_1 = require("../merchant/Merchant.model");
let RefreshToken = class RefreshToken extends sequelize_typescript_1.Model {
    // Check if token is expired
    get isExpired() {
        return new Date() > this.expiresAt;
    }
    // Check if token is valid
    get isValid() {
        return this.isActive && !this.isExpired;
    }
};
exports.RefreshToken = RefreshToken;
__decorate([
    sequelize_typescript_1.PrimaryKey,
    (0, sequelize_typescript_1.Default)(sequelize_typescript_1.DataType.UUIDV4),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)
], RefreshToken.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Merchant_model_1.Merchant),
    (0, sequelize_typescript_1.AllowNull)(false),
    sequelize_typescript_1.Index,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)
], RefreshToken.prototype, "merchantId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Merchant_model_1.Merchant)
], RefreshToken.prototype, "merchant", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT)
], RefreshToken.prototype, "token", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE)
], RefreshToken.prototype, "expiresAt", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)
], RefreshToken.prototype, "isActive", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)
], RefreshToken.prototype, "deviceInfo", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)
], RefreshToken.prototype, "ipAddress", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt
], RefreshToken.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt
], RefreshToken.prototype, "updatedAt", void 0);
exports.RefreshToken = RefreshToken = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "refresh_tokens",
        timestamps: true,
        indexes: [
            { fields: ["merchant_id"] },
            { fields: ["expires_at"] },
            { unique: true, fields: ["token"] },
        ],
    })
], RefreshToken);
