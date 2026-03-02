"use strict";
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
exports.ProductService = void 0;
const Product_model_1 = require("./Product.model");
const MerchantSettings_model_1 = require("../merchant_settings/MerchantSettings.model");
const enums_1 = require("../../constants/enums");
const sequelize_1 = require("sequelize");
const utils_1 = require("@medtech/utils");
class ProductService {
    /**
     * Get all products for a merchant with pagination and filters
     */
    static getAllProducts(merchantId_1) {
        return __awaiter(this, arguments, void 0, function* (merchantId, options = {}) {
            const { page = 1, limit = 20, search, category, status, isActive, } = options;
            const offset = (page - 1) * limit;
            // Build where clause
            const where = { merchantId };
            if (search) {
                where[sequelize_1.Op.or] = [
                    { name: { [sequelize_1.Op.iLike]: `%${search}%` } },
                    { brand: { [sequelize_1.Op.iLike]: `%${search}%` } },
                    { sku: { [sequelize_1.Op.iLike]: `%${search}%` } },
                ];
            }
            if (category) {
                where.category = category;
            }
            if (status) {
                where.status = status;
            }
            if (isActive !== undefined) {
                where.isActive = isActive;
            }
            const { rows: products, count: total } = yield Product_model_1.Product.findAndCountAll({
                where,
                limit,
                offset,
                order: [["createdAt", "DESC"]],
            });
            return {
                products,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        });
    }
    /**
     * Get a single product by ID
     */
    static getProductById(merchantId, productId) {
        return __awaiter(this, void 0, void 0, function* () {
            const product = yield Product_model_1.Product.findOne({
                where: { id: productId, merchantId },
            });
            if (!product) {
                throw new utils_1.HttpException(404, "Product not found");
            }
            return product;
        });
    }
    /**
     * Create a new product
     */
    static createProduct(merchantId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Get merchant settings to determine low stock threshold
            const settings = yield MerchantSettings_model_1.MerchantSettings.findOne({ where: { merchantId } });
            const lowStockThreshold = ((_a = settings === null || settings === void 0 ? void 0 : settings.storePreferences) === null || _a === void 0 ? void 0 : _a.lowStockThreshold) || 10;
            // Calculate initial status based on inventory
            let status;
            if (data.inventory === 0) {
                status = enums_1.ProductStatus.OUT_OF_STOCK;
            }
            else if (data.inventory <= lowStockThreshold) {
                status = enums_1.ProductStatus.LOW_STOCK;
            }
            else {
                status = enums_1.ProductStatus.IN_STOCK;
            }
            // Ensure first image is marked as main
            if (data.images && data.images.length > 0) {
                data.images[0].isMain = true;
                // Ensure only first image is main
                for (let i = 1; i < data.images.length; i++) {
                    data.images[i].isMain = false;
                }
            }
            const product = yield Product_model_1.Product.create(Object.assign(Object.assign({}, data), { merchantId,
                status }));
            return product;
        });
    }
    /**
     * Update an existing product
     */
    static updateProduct(merchantId, productId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const product = yield this.getProductById(merchantId, productId);
            // If images are being updated, ensure first is marked as main
            if (data.images && data.images.length > 0) {
                data.images[0].isMain = true;
                for (let i = 1; i < data.images.length; i++) {
                    data.images[i].isMain = false;
                }
            }
            // If inventory is being updated, recalculate status
            if (data.inventory !== undefined) {
                const settings = yield MerchantSettings_model_1.MerchantSettings.findOne({ where: { merchantId } });
                const lowStockThreshold = ((_a = settings === null || settings === void 0 ? void 0 : settings.storePreferences) === null || _a === void 0 ? void 0 : _a.lowStockThreshold) || 10;
                if (data.inventory === 0) {
                    data.status = enums_1.ProductStatus.OUT_OF_STOCK;
                }
                else if (data.inventory <= lowStockThreshold) {
                    data.status = enums_1.ProductStatus.LOW_STOCK;
                }
                else {
                    data.status = enums_1.ProductStatus.IN_STOCK;
                }
            }
            yield product.update(data);
            return product;
        });
    }
    /**
     * Soft delete a product
     */
    static deleteProduct(merchantId, productId) {
        return __awaiter(this, void 0, void 0, function* () {
            const product = yield this.getProductById(merchantId, productId);
            yield product.destroy(); // Soft delete (paranoid mode)
            return { message: "Product deleted successfully" };
        });
    }
    /**
     * Update product stock/inventory
     */
    static updateStock(merchantId, productId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const product = yield this.getProductById(merchantId, productId);
            // Get merchant settings for low stock threshold
            const settings = yield MerchantSettings_model_1.MerchantSettings.findOne({ where: { merchantId } });
            const lowStockThreshold = ((_a = settings === null || settings === void 0 ? void 0 : settings.storePreferences) === null || _a === void 0 ? void 0 : _a.lowStockThreshold) || 10;
            // Calculate new status
            let status;
            if (data.inventory === 0) {
                status = enums_1.ProductStatus.OUT_OF_STOCK;
            }
            else if (data.inventory <= lowStockThreshold) {
                status = enums_1.ProductStatus.LOW_STOCK;
            }
            else {
                status = enums_1.ProductStatus.IN_STOCK;
            }
            yield product.update({
                inventory: data.inventory,
                status,
            });
            return product;
        });
    }
    /**
     * Get low stock products for a merchant
     */
    static getLowStockProducts(merchantId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const settings = yield MerchantSettings_model_1.MerchantSettings.findOne({ where: { merchantId } });
            const lowStockThreshold = ((_a = settings === null || settings === void 0 ? void 0 : settings.storePreferences) === null || _a === void 0 ? void 0 : _a.lowStockThreshold) || 10;
            const products = yield Product_model_1.Product.findAll({
                where: {
                    merchantId,
                    inventory: {
                        [sequelize_1.Op.lte]: lowStockThreshold,
                        [sequelize_1.Op.gt]: 0,
                    },
                    status: enums_1.ProductStatus.LOW_STOCK,
                    isActive: true,
                },
                order: [["inventory", "ASC"]],
            });
            return products;
        });
    }
    /**
     * Get out of stock products
     */
    static getOutOfStockProducts(merchantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const products = yield Product_model_1.Product.findAll({
                where: {
                    merchantId,
                    inventory: 0,
                    status: enums_1.ProductStatus.OUT_OF_STOCK,
                },
                order: [["updatedAt", "DESC"]],
            });
            return products;
        });
    }
    /**
     * Restore a soft-deleted product
     */
    static restoreProduct(merchantId, productId) {
        return __awaiter(this, void 0, void 0, function* () {
            const product = yield Product_model_1.Product.findOne({
                where: { id: productId, merchantId },
                paranoid: false, // Include soft-deleted records
            });
            if (!product) {
                throw new utils_1.HttpException(404, "Product not found");
            }
            if (!product.deletedAt) {
                throw new utils_1.HttpException(400, "Product is not deleted");
            }
            yield product.restore();
            return product;
        });
    }
    /**
     * Increment stock (e.g., when restocking)
     */
    static incrementStock(merchantId, productId, quantity) {
        return __awaiter(this, void 0, void 0, function* () {
            if (quantity <= 0) {
                throw new utils_1.HttpException(400, "Quantity must be positive");
            }
            const product = yield this.getProductById(merchantId, productId);
            const newInventory = product.inventory + quantity;
            return yield this.updateStock(merchantId, productId, {
                inventory: newInventory,
            });
        });
    }
    /**
     * Decrement stock (e.g., after an order)
     * Note: This is for manual adjustments. Order service handles order-based decrements.
     */
    static decrementStock(merchantId, productId, quantity) {
        return __awaiter(this, void 0, void 0, function* () {
            if (quantity <= 0) {
                throw new utils_1.HttpException(400, "Quantity must be positive");
            }
            const product = yield this.getProductById(merchantId, productId);
            const newInventory = Math.max(0, product.inventory - quantity);
            return yield this.updateStock(merchantId, productId, {
                inventory: newInventory,
            });
        });
    }
    /**
     * Get product statistics for dashboard
     */
    static getProductStats(merchantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const [totalProducts, activeProducts, lowStockCount, outOfStockCount] = yield Promise.all([
                Product_model_1.Product.count({ where: { merchantId } }),
                Product_model_1.Product.count({ where: { merchantId, isActive: true } }),
                Product_model_1.Product.count({
                    where: { merchantId, status: enums_1.ProductStatus.LOW_STOCK },
                }),
                Product_model_1.Product.count({
                    where: { merchantId, status: enums_1.ProductStatus.OUT_OF_STOCK },
                }),
            ]);
            return {
                totalProducts,
                activeProducts,
                lowStockCount,
                outOfStockCount,
                inStockCount: activeProducts - lowStockCount - outOfStockCount,
            };
        });
    }
}
exports.ProductService = ProductService;
