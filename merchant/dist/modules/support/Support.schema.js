"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactSupportSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.contactSupportSchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(2).max(100).required().messages({
        "string.min": "Name must be at least 2 characters",
        "string.max": "Name cannot exceed 100 characters",
        "any.required": "Name is required",
    }),
    email: joi_1.default.string().email().required().messages({
        "string.email": "Please provide a valid email address",
        "any.required": "Email is required",
    }),
    subject: joi_1.default.string().trim().min(3).max(200).required().messages({
        "string.min": "Subject must be at least 3 characters",
        "string.max": "Subject cannot exceed 200 characters",
        "any.required": "Subject is required",
    }),
    message: joi_1.default.string().trim().min(10).max(2000).required().messages({
        "string.min": "Message must be at least 10 characters",
        "string.max": "Message cannot exceed 2000 characters",
        "any.required": "Message is required",
    }),
});
