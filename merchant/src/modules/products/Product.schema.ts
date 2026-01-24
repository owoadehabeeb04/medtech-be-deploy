import Joi from "joi";
import {
  PRODUCT_STATUSES,
} from "../../constants/enums";

// Product Image Schema
const productImageSchema = Joi.object({
  url: Joi.string().uri().required().messages({
    "string.uri": "Image URL must be a valid URI",
    "any.required": "Image URL is required",
  }),
  order: Joi.number().integer().min(1).max(3).required().messages({
    "number.min": "Image order must be between 1 and 3",
    "number.max": "Image order must be between 1 and 3",
    "any.required": "Image order is required",
  }),
  isMain: Joi.boolean().required().messages({
    "any.required": "isMain flag is required",
  }),
});

// Create Product Schema
export const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).required().messages({
    "string.min": "Product name must be at least 2 characters",
    "string.max": "Product name cannot exceed 255 characters",
    "any.required": "Product name is required",
  }),

  description: Joi.string().trim().max(2000).allow("").optional(),

  category: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      "string.min": "Category name must be at least 2 characters",
      "string.max": "Category name cannot exceed 100 characters",
      "any.required": "Product category is required",
    }),

  brand: Joi.string().trim().min(1).max(100).required().messages({
    "string.min": "Brand name is required",
    "string.max": "Brand name cannot exceed 100 characters",
    "any.required": "Brand is required",
  }),

  sku: Joi.string().trim().max(100).optional(),

  price: Joi.number().min(0).required().messages({
    "number.min": "Price must be a positive number",
    "any.required": "Price is required",
  }),

  vat: Joi.number().min(0).required().messages({
    "number.min": "VAT must be a positive number",
    "any.required": "VAT is required",
  }),

  discountPercentage: Joi.number().min(0).max(100).default(0).messages({
    "number.min": "Discount percentage cannot be negative",
    "number.max": "Discount percentage cannot exceed 100",
  }),

  minQuantity: Joi.number().integer().min(1).default(1).messages({
    "number.min": "Minimum quantity must be at least 1",
  }),

  maxQuantity: Joi.number().integer().min(1).default(100).messages({
    "number.min": "Maximum quantity must be at least 1",
  }),

  inventory: Joi.number().integer().min(0).required().messages({
    "number.min": "Inventory cannot be negative",
    "any.required": "Inventory is required",
  }),

  images: Joi.array()
    .items(productImageSchema)
    .min(1)
    .max(3)
    .required()
    .custom((value, helpers) => {
      // Ensure first image is marked as main
      if (value.length > 0 && !value[0].isMain) {
        return helpers.error("First image must be marked as main");
      }

      // Ensure only one main image
      const mainImages = value.filter((img: any) => img.isMain);
      if (mainImages.length !== 1) {
        return helpers.error("Exactly one image must be marked as main");
      }

      // Ensure unique order numbers
      const orders = value.map((img: any) => img.order);
      if (new Set(orders).size !== orders.length) {
        return helpers.error("Image order numbers must be unique");
      }

      return value;
    })
    .messages({
      "array.min": "At least 1 product image is required",
      "array.max": "Maximum 3 product images allowed",
      "any.required": "Product images are required",
    }),

  isActive: Joi.boolean().default(true),
}).custom((value, helpers) => {
  // Validate that maxQuantity >= minQuantity
  if (value.maxQuantity && value.minQuantity && value.maxQuantity < value.minQuantity) {
    return helpers.error("Maximum quantity must be greater than or equal to minimum quantity");
  }
  return value;
});

// Update Product Schema
export const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).optional(),
  description: Joi.string().trim().max(2000).allow("").optional(),
  category: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      "string.min": "Category name must be at least 2 characters",
      "string.max": "Category name cannot exceed 100 characters",
    }),
  brand: Joi.string().trim().min(1).max(100).optional(),
  sku: Joi.string().trim().max(100).optional(),
  price: Joi.number().min(0).optional(),
  vat: Joi.number().min(0).optional(),
  discountPercentage: Joi.number().min(0).max(100).optional(),
  minQuantity: Joi.number().integer().min(1).optional(),
  maxQuantity: Joi.number().integer().min(1).optional(),
  inventory: Joi.number().integer().min(0).optional(),
  images: Joi.array()
    .items(productImageSchema)
    .min(1)
    .max(3)
    .optional()
    .custom((value, helpers) => {
      if (value.length > 0 && !value[0].isMain) {
        return helpers.error("First image must be marked as main");
      }
      const mainImages = value.filter((img: any) => img.isMain);
      if (mainImages.length !== 1) {
        return helpers.error("Exactly one image must be marked as main");
      }
      const orders = value.map((img: any) => img.order);
      if (new Set(orders).size !== orders.length) {
        return helpers.error("Image order numbers must be unique");
      }
      return value;
    }),
  isActive: Joi.boolean().optional(),
  status: Joi.string()
    .valid(...PRODUCT_STATUSES)
    .optional(),
}).custom((value, helpers) => {
  if (value.maxQuantity && value.minQuantity && value.maxQuantity < value.minQuantity) {
    return helpers.error("Maximum quantity must be greater than or equal to minimum quantity");
  }
  return value;
});

// Update Stock Schema
export const updateStockSchema = Joi.object({
  inventory: Joi.number().integer().min(0).required().messages({
    "number.min": "Inventory cannot be negative",
    "any.required": "Inventory is required",
  }),
});
