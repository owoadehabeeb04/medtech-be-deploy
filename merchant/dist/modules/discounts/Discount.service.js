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
exports.DiscountService = void 0;
const Discount_model_1 = require("./Discount.model");
const Product_model_1 = require("../products/Product.model");
const enums_1 = require("../../constants/enums");
const sequelize_1 = require("sequelize");
const utils_1 = require("@medtech/utils");
class DiscountService {
    /**
     * Get all discounts for a merchant with pagination and filters
     */
    static getAllDiscounts(merchantId_1) {
        return __awaiter(this, arguments, void 0, function* (merchantId, options = {}) {
            const { page = 1, limit = 20, search, status, isExpired } = options;
            const offset = (page - 1) * limit;
            // Build where clause
            const where = { merchantId };
            if (search) {
                where.code = { [sequelize_1.Op.iLike]: `%${search}%` };
            }
            if (status) {
                where.status = status;
            }
            // Filter by expiration
            if (isExpired !== undefined) {
                const now = new Date();
                if (isExpired) {
                    where[sequelize_1.Op.or] = [
                        { endDate: { [sequelize_1.Op.lt]: now } },
                        { startDate: { [sequelize_1.Op.gt]: now } },
                    ];
                }
                else {
                    where.startDate = { [sequelize_1.Op.lte]: now };
                    where.endDate = { [sequelize_1.Op.gte]: now };
                }
            }
            const { rows: discounts, count: total } = yield Discount_model_1.Discount.findAndCountAll({
                where,
                limit,
                offset,
                order: [["createdAt", "DESC"]],
            });
            return {
                discounts,
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
     * Get a single discount by ID
     */
    static getDiscountById(merchantId, discountId) {
        return __awaiter(this, void 0, void 0, function* () {
            const discount = yield Discount_model_1.Discount.findOne({
                where: { id: discountId, merchantId },
            });
            if (!discount) {
                throw new utils_1.HttpException(404, "Discount not found");
            }
            return discount;
        });
    }
    /**
     * Get a discount by code
     */
    static getDiscountByCode(merchantId, code) {
        return __awaiter(this, void 0, void 0, function* () {
            const discount = yield Discount_model_1.Discount.findOne({
                where: { merchantId, code: code.toUpperCase() },
            });
            if (!discount) {
                throw new utils_1.HttpException(404, "Discount code not found");
            }
            return discount;
        });
    }
    /**
     * Create a new discount
     */
    static createDiscount(merchantId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if code already exists for this merchant
            const existingDiscount = yield Discount_model_1.Discount.findOne({
                where: {
                    merchantId,
                    code: data.code.toUpperCase(),
                },
                paranoid: false, // Check even soft-deleted ones
            });
            if (existingDiscount && !existingDiscount.deletedAt) {
                throw new utils_1.HttpException(400, "Discount code already exists");
            }
            if (existingDiscount && existingDiscount.deletedAt) {
                throw new utils_1.HttpException(400, "Discount code was previously used. Please choose a different code.");
            }
            // Validate dates
            if (new Date(data.startDate) >= new Date(data.endDate)) {
                throw new utils_1.HttpException(400, "End date must be after start date");
            }
            // Validate percentage amount
            if (data.type === enums_1.DiscountType.PERCENTAGE && data.amount > 100) {
                throw new utils_1.HttpException(400, "Percentage discount cannot exceed 100");
            }
            // Ensure code is uppercase
            const discount = yield Discount_model_1.Discount.create(Object.assign(Object.assign({}, data), { merchantId, code: data.code.toUpperCase() }));
            return discount;
        });
    }
    /**
     * Update an existing discount
     */
    static updateDiscount(merchantId, discountId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const discount = yield this.getDiscountById(merchantId, discountId);
            // If code is being changed, check uniqueness
            if (data.code && data.code !== discount.code) {
                const existingDiscount = yield Discount_model_1.Discount.findOne({
                    where: {
                        merchantId,
                        code: data.code.toUpperCase(),
                        id: { [sequelize_1.Op.ne]: discountId },
                    },
                });
                if (existingDiscount) {
                    throw new utils_1.HttpException(400, "Discount code already exists");
                }
                data.code = data.code.toUpperCase();
            }
            // Validate dates if both are provided
            if (data.startDate && data.endDate) {
                if (new Date(data.startDate) >= new Date(data.endDate)) {
                    throw new utils_1.HttpException(400, "End date must be after start date");
                }
            }
            // Validate percentage amount
            if (data.type === enums_1.DiscountType.PERCENTAGE &&
                data.amount !== undefined &&
                data.amount > 100) {
                throw new utils_1.HttpException(400, "Percentage discount cannot exceed 100");
            }
            yield discount.update(data);
            return discount;
        });
    }
    /**
     * Soft delete a discount
     */
    static deleteDiscount(merchantId, discountId) {
        return __awaiter(this, void 0, void 0, function* () {
            const discount = yield this.getDiscountById(merchantId, discountId);
            yield discount.destroy(); // Soft delete (paranoid mode)
            return { message: "Discount deleted successfully" };
        });
    }
    /**
     * Validate a discount code for use in an order
     * This endpoint will be called by the order service
     */
    static validateDiscountCode(merchantId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { code, orderAmount, productIds } = data;
            // Find the discount
            const discount = yield this.getDiscountByCode(merchantId, code);
            // Check if discount is active
            if (discount.status !== enums_1.DiscountStatus.ACTIVE) {
                throw new utils_1.HttpException(400, "Discount code is inactive");
            }
            // Check date validity
            const now = new Date();
            if (now < discount.startDate) {
                throw new utils_1.HttpException(400, "Discount code is not yet active");
            }
            if (now > discount.endDate) {
                throw new utils_1.HttpException(400, "Discount code has expired");
            }
            // Check usage limit
            if (discount.usageLimit !== null &&
                discount.usageCount >= discount.usageLimit) {
                throw new utils_1.HttpException(400, "Discount code usage limit reached");
            }
            // Check minimum order amount
            if (discount.minOrderAmount && orderAmount < discount.minOrderAmount) {
                throw new utils_1.HttpException(400, `Minimum order amount of ₦${discount.minOrderAmount} required`);
            }
            // Check product applicability
            if (!discount.applyToAllProducts) {
                let isApplicable = false;
                // Check if any products match
                if (discount.applicableProducts && discount.applicableProducts.length > 0) {
                    const matchingProducts = productIds.filter((id) => discount.applicableProducts.includes(id));
                    if (matchingProducts.length > 0) {
                        isApplicable = true;
                    }
                }
                // Check if any product categories match
                if (!isApplicable &&
                    discount.applicableCategories &&
                    discount.applicableCategories.length > 0) {
                    const products = yield Product_model_1.Product.findAll({
                        where: {
                            merchantId,
                            id: { [sequelize_1.Op.in]: productIds },
                        },
                        attributes: ["category"],
                    });
                    const categories = products.map((p) => p.category);
                    const matchingCategories = categories.filter((cat) => discount.applicableCategories.includes(cat));
                    if (matchingCategories.length > 0) {
                        isApplicable = true;
                    }
                }
                if (!isApplicable) {
                    throw new utils_1.HttpException(400, "Discount code is not applicable to items in your cart");
                }
            }
            // Calculate discount amount
            let discountAmount;
            if (discount.type === enums_1.DiscountType.PERCENTAGE) {
                discountAmount = (orderAmount * discount.amount) / 100;
            }
            else {
                discountAmount = discount.amount;
            }
            // Ensure discount doesn't exceed order amount
            discountAmount = Math.min(discountAmount, orderAmount);
            return {
                valid: true,
                discountId: discount.id,
                code: discount.code,
                type: discount.type,
                amount: discount.amount,
                discountAmount: parseFloat(discountAmount.toFixed(2)),
                message: "Discount code is valid",
            };
        });
    }
    /**
     * Increment usage count for a discount
     * Called by order service after successful order
     */
    static incrementUsageCount(merchantId, discountId) {
        return __awaiter(this, void 0, void 0, function* () {
            const discount = yield this.getDiscountById(merchantId, discountId);
            yield discount.update({
                usageCount: discount.usageCount + 1,
            });
            return discount;
        });
    }
    /**
     * Restore a soft-deleted discount
     */
    static restoreDiscount(merchantId, discountId) {
        return __awaiter(this, void 0, void 0, function* () {
            const discount = yield Discount_model_1.Discount.findOne({
                where: { id: discountId, merchantId },
                paranoid: false, // Include soft-deleted records
            });
            if (!discount) {
                throw new utils_1.HttpException(404, "Discount not found");
            }
            if (!discount.deletedAt) {
                throw new utils_1.HttpException(400, "Discount is not deleted");
            }
            yield discount.restore();
            return discount;
        });
    }
    /**
     * Get discount statistics
     */
    static getDiscountStats(merchantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const [totalDiscounts, activeDiscounts, expiredDiscounts, usedCount] = yield Promise.all([
                Discount_model_1.Discount.count({ where: { merchantId } }),
                Discount_model_1.Discount.count({
                    where: {
                        merchantId,
                        status: enums_1.DiscountStatus.ACTIVE,
                        startDate: { [sequelize_1.Op.lte]: now },
                        endDate: { [sequelize_1.Op.gte]: now },
                    },
                }),
                Discount_model_1.Discount.count({
                    where: {
                        merchantId,
                        endDate: { [sequelize_1.Op.lt]: now },
                    },
                }),
                Discount_model_1.Discount.sum("usageCount", { where: { merchantId } }),
            ]);
            return {
                totalDiscounts,
                activeDiscounts,
                expiredDiscounts,
                totalUsageCount: usedCount || 0,
            };
        });
    }
    /**
     * Get active discounts (currently valid)
     */
    static getActiveDiscounts(merchantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const discounts = yield Discount_model_1.Discount.findAll({
                where: {
                    merchantId,
                    status: enums_1.DiscountStatus.ACTIVE,
                    startDate: { [sequelize_1.Op.lte]: now },
                    endDate: { [sequelize_1.Op.gte]: now },
                },
                order: [["createdAt", "DESC"]],
            });
            return discounts;
        });
    }
}
exports.DiscountService = DiscountService;
