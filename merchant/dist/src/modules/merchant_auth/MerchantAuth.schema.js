"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResetPasswordSchema = exports.ForgotPasswordSchema = exports.LoginSchema = exports.CompleteSignupSchema = exports.VerifyOtpSchema = exports.SignupSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.SignupSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    name: joi_1.default.string().min(2).max(100).required(),
});
exports.VerifyOtpSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    otp: joi_1.default.string().length(4).pattern(/^\d+$/).required(),
});
exports.CompleteSignupSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    businessName: joi_1.default.string().min(2).max(200).required(),
    phoneNumber: joi_1.default.string().min(10).max(15).required(),
    password: joi_1.default.string().min(6).required(),
    confirmPassword: joi_1.default.string().valid(joi_1.default.ref("password")).required(),
    licenseUrl: joi_1.default.string().uri().optional(),
});
exports.LoginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().required(),
});
exports.ForgotPasswordSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
});
exports.ResetPasswordSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    newPassword: joi_1.default.string().min(6).required(),
    confirmPassword: joi_1.default.string().valid(joi_1.default.ref("newPassword")).required(),
});
