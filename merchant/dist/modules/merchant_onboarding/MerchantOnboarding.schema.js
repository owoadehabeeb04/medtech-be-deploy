"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyBankSchema = exports.UploadProfilePictureSchema = exports.UploadValidIdSchema = exports.AcceptTermsSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.AcceptTermsSchema = joi_1.default.object({
    accepted: joi_1.default.boolean().valid(true).required().messages({
        "any.only": "You must accept the terms and conditions",
        "any.required": "Acceptance is required",
    }),
});
exports.UploadValidIdSchema = joi_1.default.object({
    validIdUrl: joi_1.default.string().uri().required().messages({
        "string.uri": "Valid ID URL must be a valid URL",
        "string.empty": "Valid ID URL is required",
        "any.required": "Valid ID URL is required",
    }),
});
exports.UploadProfilePictureSchema = joi_1.default.object({
    profilePictureUrl: joi_1.default.string().uri().required().messages({
        "string.uri": "Profile picture URL must be a valid URL",
        "string.empty": "Profile picture URL is required",
        "any.required": "Profile picture URL is required",
    }),
});
exports.VerifyBankSchema = joi_1.default.object({
    bankCode: joi_1.default.string().required().messages({
        "string.empty": "Bank code is required",
        "any.required": "Bank code is required",
    }),
    accountNumber: joi_1.default.string()
        .pattern(/^[0-9]{10}$/)
        .required()
        .messages({
        "string.pattern.base": "Account number must be exactly 10 digits",
        "string.empty": "Account number is required",
        "any.required": "Account number is required",
    }),
    accountName: joi_1.default.string().min(3).max(100).required().messages({
        "string.min": "Account name must be at least 3 characters",
        "string.max": "Account name cannot exceed 100 characters",
        "string.empty": "Account name is required",
        "any.required": "Account name is required",
    }),
});
