"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDiscountSchema = exports.updateDiscountSchema = exports.createDiscountSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const enums_1 = require("../../constants/enums");
// Create Discount Schema
exports.createDiscountSchema = joi_1.default.object({
    code: joi_1.default.string()
        .trim()
        .uppercase()
        .min(3)
        .max(50)
        .pattern(/^[A-Z0-9-_]+$/)
        .required()
        .messages({
        "string.min": "Discount code must be at least 3 characters",
        "string.max": "Discount code cannot exceed 50 characters",
        "string.pattern.base": "Discount code must contain only uppercase letters, numbers, hyphens, and underscores",
        "any.required": "Discount code is required",
    }),
    type: joi_1.default.string()
        .valid(...enums_1.DISCOUNT_TYPES)
        .required()
        .messages({
        "any.only": "Invalid discount type. Must be 'fixed_amount' or 'percentage'",
        "any.required": "Discount type is required",
    }),
    amount: joi_1.default.number().min(0).required().messages({
        "number.min": "Discount amount must be positive",
        "any.required": "Discount amount is required",
    }),
    applyToAllProducts: joi_1.default.boolean().default(false),
    applicableProducts: joi_1.default.array().items(joi_1.default.string().uuid()).optional().messages({
        "array.base": "Applicable products must be an array of product IDs",
    }),
    applicableCategories: joi_1.default.array()
        .items(joi_1.default.string().valid(...enums_1.PRODUCT_CATEGORIES))
        .optional()
        .messages({
        "any.only": "Invalid category in applicableCategories",
    }),
    minOrderAmount: joi_1.default.number().min(0).optional().messages({
        "number.min": "Minimum order amount must be positive",
    }),
    status: joi_1.default.string()
        .valid(...enums_1.DISCOUNT_STATUSES)
        .default("active")
        .messages({
        "any.only": "Invalid discount status. Must be 'active' or 'inactive'",
    }),
    startDate: joi_1.default.date().iso().required().messages({
        "date.base": "Start date must be a valid date",
        "any.required": "Start date is required",
    }),
    endDate: joi_1.default.date().iso().greater(joi_1.default.ref("startDate")).required().messages({
        "date.base": "End date must be a valid date",
        "date.greater": "End date must be after start date",
        "any.required": "End date is required",
    }),
    usageLimit: joi_1.default.number().integer().min(1).optional().messages({
        "number.min": "Usage limit must be at least 1",
    }),
    perUserLimit: joi_1.default.number().integer().min(1).optional().messages({
        "number.min": "Per user limit must be at least 1",
    }),
})
    .custom((value, helpers) => {
    // If type is percentage, amount must be between 0-100
    if (value.type === "percentage" && value.amount > 100) {
        return helpers.error("Percentage discount cannot exceed 100");
    }
    // If not applying to all products, must specify products or categories
    if (!value.applyToAllProducts &&
        (!value.applicableProducts || value.applicableProducts.length === 0) &&
        (!value.applicableCategories || value.applicableCategories.length === 0)) {
        return helpers.error("Must specify applicable products or categories when not applying to all products");
    }
    return value;
});
// Update Discount Schema
exports.updateDiscountSchema = joi_1.default.object({
    code: joi_1.default.string()
        .trim()
        .uppercase()
        .min(3)
        .max(50)
        .pattern(/^[A-Z0-9-_]+$/)
        .optional()
        .messages({
        "string.min": "Discount code must be at least 3 characters",
        "string.max": "Discount code cannot exceed 50 characters",
        "string.pattern.base": "Discount code must contain only uppercase letters, numbers, hyphens, and underscores",
    }),
    type: joi_1.default.string()
        .valid(...enums_1.DISCOUNT_TYPES)
        .optional()
        .messages({
        "any.only": "Invalid discount type. Must be 'fixed_amount' or 'percentage'",
    }),
    amount: joi_1.default.number().min(0).optional().messages({
        "number.min": "Discount amount must be positive",
    }),
    applyToAllProducts: joi_1.default.boolean().optional(),
    applicableProducts: joi_1.default.array().items(joi_1.default.string().uuid()).optional().messages({
        "array.base": "Applicable products must be an array of product IDs",
    }),
    applicableCategories: joi_1.default.array()
        .items(joi_1.default.string().valid(...enums_1.PRODUCT_CATEGORIES))
        .optional()
        .messages({
        "any.only": "Invalid category in applicableCategories",
    }),
    minOrderAmount: joi_1.default.number().min(0).optional().messages({
        "number.min": "Minimum order amount must be positive",
    }),
    status: joi_1.default.string()
        .valid(...enums_1.DISCOUNT_STATUSES)
        .optional()
        .messages({
        "any.only": "Invalid discount status. Must be 'active' or 'inactive'",
    }),
    startDate: joi_1.default.date().iso().optional().messages({
        "date.base": "Start date must be a valid date",
    }),
    endDate: joi_1.default.date().iso().optional().messages({
        "date.base": "End date must be a valid date",
    }),
    usageLimit: joi_1.default.number().integer().min(1).optional().messages({
        "number.min": "Usage limit must be at least 1",
    }),
    perUserLimit: joi_1.default.number().integer().min(1).optional().messages({
        "number.min": "Per user limit must be at least 1",
    }),
})
    .custom((value, helpers) => {
    // If type is percentage, amount must be between 0-100
    if (value.type === "percentage" && value.amount !== undefined && value.amount > 100) {
        return helpers.error("Percentage discount cannot exceed 100");
    }
    // If startDate and endDate are both provided, validate endDate > startDate
    if (value.startDate && value.endDate && value.endDate <= value.startDate) {
        return helpers.error("End date must be after start date");
    }
    return value;
});
// Validate Discount Code Schema (for order service to verify discount applicability)
exports.validateDiscountSchema = joi_1.default.object({
    code: joi_1.default.string().trim().uppercase().required().messages({
        "any.required": "Discount code is required",
    }),
    orderAmount: joi_1.default.number().min(0).required().messages({
        "number.min": "Order amount must be positive",
        "any.required": "Order amount is required",
    }),
    // Accept both 'productIds' and 'products' for backward compatibility
    productIds: joi_1.default.array().items(joi_1.default.string().uuid()).min(1).optional().messages({
        "array.min": "At least one product ID is required",
    }),
    products: joi_1.default.array().items(joi_1.default.string().uuid()).min(1).optional().messages({
        "array.min": "At least one product ID is required",
    }),
})
    .or("productIds", "products")
    .custom((value, helpers) => {
    // Normalize: if 'products' is provided, map it to 'productIds'
    if (value.products && !value.productIds) {
        value.productIds = value.products;
        delete value.products;
    }
    return value;
})
    .messages({
    "object.missing": "Product IDs are required. Please provide either 'productIds' or 'products'",
});
