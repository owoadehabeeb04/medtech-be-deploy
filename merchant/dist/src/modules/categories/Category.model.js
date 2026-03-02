"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Category = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const Merchant_model_1 = require("../merchant/Merchant.model");
let Category = class Category extends sequelize_typescript_1.Model {
    /**
     * Seed default categories for a new merchant
     */
    static seedDefaultCategories(merchantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const defaultCategories = [
                { name: "Antibiotics", description: "Antibiotic medications", isDefault: true },
                { name: "Pain Relief", description: "Pain relief medications", isDefault: true },
            ];
            for (const categoryData of defaultCategories) {
                yield this.findOrCreate({
                    where: {
                        merchantId,
                        name: categoryData.name,
                    },
                    defaults: {
                        merchantId,
                        name: categoryData.name,
                        description: categoryData.description,
                        isDefault: categoryData.isDefault,
                        isActive: true,
                    },
                });
            }
        });
    }
};
exports.Category = Category;
__decorate([
    sequelize_typescript_1.PrimaryKey,
    (0, sequelize_typescript_1.Default)(sequelize_typescript_1.DataType.UUIDV4),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)
], Category.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Merchant_model_1.Merchant),
    (0, sequelize_typescript_1.AllowNull)(false),
    sequelize_typescript_1.Index,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)
], Category.prototype, "merchantId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Merchant_model_1.Merchant)
], Category.prototype, "merchant", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    sequelize_typescript_1.Index,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(100))
], Category.prototype, "name", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT)
], Category.prototype, "description", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)
], Category.prototype, "isDefault", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)
], Category.prototype, "isActive", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt
], Category.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt
], Category.prototype, "updatedAt", void 0);
__decorate([
    sequelize_typescript_1.DeletedAt
], Category.prototype, "deletedAt", void 0);
exports.Category = Category = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "categories",
        timestamps: true,
        paranoid: true, // Enable soft delete
        indexes: [
            { fields: ["merchant_id"] },
            { fields: ["name"] },
            { fields: ["deleted_at"] },
            { unique: true, fields: ["merchant_id", "name"], name: "unique_merchant_category" },
        ],
    })
], Category);
