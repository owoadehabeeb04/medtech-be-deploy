"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCategorySchema = exports.createCategorySchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createCategorySchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(2).max(100).required().messages({
        "string.min": "Category name must be at least 2 characters",
        "string.max": "Category name cannot exceed 100 characters",
        "any.required": "Category name is required",
    }),
    description: joi_1.default.string().trim().max(500).allow("").optional(),
});
exports.updateCategorySchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(2).max(100).optional().messages({
        "string.min": "Category name must be at least 2 characters",
        "string.max": "Category name cannot exceed 100 characters",
    }),
    description: joi_1.default.string().trim().max(500).allow("").optional(),
    isActive: joi_1.default.boolean().optional(),
});
