import Joi from "joi";
import {
  DISCOUNT_TYPES,
  DISCOUNT_STATUSES,
  PRODUCT_CATEGORIES,
} from "../../constants/enums";

// Create Discount Schema
export const createDiscountSchema = Joi.object({
  code: Joi.string()
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

  type: Joi.string()
    .valid(...DISCOUNT_TYPES)
    .required()
    .messages({
      "any.only": "Invalid discount type. Must be 'fixed_amount' or 'percentage'",
      "any.required": "Discount type is required",
    }),

  amount: Joi.number().min(0).required().messages({
    "number.min": "Discount amount must be positive",
    "any.required": "Discount amount is required",
  }),

  applyToAllProducts: Joi.boolean().default(false),

  applicableProducts: Joi.array().items(Joi.string().uuid()).optional().messages({
    "array.base": "Applicable products must be an array of product IDs",
  }),

  applicableCategories: Joi.array()
    .items(Joi.string().valid(...PRODUCT_CATEGORIES))
    .optional()
    .messages({
      "any.only": "Invalid category in applicableCategories",
    }),

  minOrderAmount: Joi.number().min(0).optional().messages({
    "number.min": "Minimum order amount must be positive",
  }),

  status: Joi.string()
    .valid(...DISCOUNT_STATUSES)
    .default("active")
    .messages({
      "any.only": "Invalid discount status. Must be 'active' or 'inactive'",
    }),

  startDate: Joi.date().iso().required().messages({
    "date.base": "Start date must be a valid date",
    "any.required": "Start date is required",
  }),

  endDate: Joi.date().iso().greater(Joi.ref("startDate")).required().messages({
    "date.base": "End date must be a valid date",
    "date.greater": "End date must be after start date",
    "any.required": "End date is required",
  }),

  usageLimit: Joi.number().integer().min(1).optional().messages({
    "number.min": "Usage limit must be at least 1",
  }),

  perUserLimit: Joi.number().integer().min(1).optional().messages({
    "number.min": "Per user limit must be at least 1",
  }),
})
  .custom((value, helpers) => {
    // If type is percentage, amount must be between 0-100
    if (value.type === "percentage" && value.amount > 100) {
      return helpers.error("Percentage discount cannot exceed 100");
    }

    // If not applying to all products, must specify products or categories
    if (
      !value.applyToAllProducts &&
      (!value.applicableProducts || value.applicableProducts.length === 0) &&
      (!value.applicableCategories || value.applicableCategories.length === 0)
    ) {
      return helpers.error(
        "Must specify applicable products or categories when not applying to all products"
      );
    }

    return value;
  });

// Update Discount Schema
export const updateDiscountSchema = Joi.object({
  code: Joi.string()
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

  type: Joi.string()
    .valid(...DISCOUNT_TYPES)
    .optional()
    .messages({
      "any.only": "Invalid discount type. Must be 'fixed_amount' or 'percentage'",
    }),

  amount: Joi.number().min(0).optional().messages({
    "number.min": "Discount amount must be positive",
  }),

  applyToAllProducts: Joi.boolean().optional(),

  applicableProducts: Joi.array().items(Joi.string().uuid()).optional().messages({
    "array.base": "Applicable products must be an array of product IDs",
  }),

  applicableCategories: Joi.array()
    .items(Joi.string().valid(...PRODUCT_CATEGORIES))
    .optional()
    .messages({
      "any.only": "Invalid category in applicableCategories",
    }),

  minOrderAmount: Joi.number().min(0).optional().messages({
    "number.min": "Minimum order amount must be positive",
  }),

  status: Joi.string()
    .valid(...DISCOUNT_STATUSES)
    .optional()
    .messages({
      "any.only": "Invalid discount status. Must be 'active' or 'inactive'",
    }),

  startDate: Joi.date().iso().optional().messages({
    "date.base": "Start date must be a valid date",
  }),

  endDate: Joi.date().iso().optional().messages({
    "date.base": "End date must be a valid date",
  }),

  usageLimit: Joi.number().integer().min(1).optional().messages({
    "number.min": "Usage limit must be at least 1",
  }),

  perUserLimit: Joi.number().integer().min(1).optional().messages({
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
export const validateDiscountSchema = Joi.object({
  code: Joi.string().trim().uppercase().required().messages({
    "any.required": "Discount code is required",
  }),

  orderAmount: Joi.number().min(0).required().messages({
    "number.min": "Order amount must be positive",
    "any.required": "Order amount is required",
  }),

  // Accept both 'productIds' and 'products' for backward compatibility
  productIds: Joi.array().items(Joi.string().uuid()).min(1).optional().messages({
    "array.min": "At least one product ID is required",
  }),

  products: Joi.array().items(Joi.string().uuid()).min(1).optional().messages({
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
