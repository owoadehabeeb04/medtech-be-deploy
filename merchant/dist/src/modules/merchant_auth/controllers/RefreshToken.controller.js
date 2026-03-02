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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshToken = void 0;
const RefreshToken_service_1 = require("../../refresh_tokens/RefreshToken.service");
const joi_1 = __importDefault(require("joi"));
const refreshTokenSchema = joi_1.default.object({
    refreshToken: joi_1.default.string().required().messages({
        "any.required": "Refresh token is required",
    }),
});
const refreshToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody } = req.context;
    const cleanBody = sanitizeBody(req.body);
    const { error: validationError, value } = validateSchema(refreshTokenSchema, cleanBody);
    if (validationError) {
        return next(manageApplicationErrors({
            message: validationError,
            statusCode: 400,
        }));
    }
    const { refreshToken: refreshTokenString } = value;
    const [error, result] = yield manageAsyncOps(RefreshToken_service_1.RefreshTokenService.refreshAccessToken(refreshTokenString));
    if (error) {
        return next(manageApplicationErrors({
            message: error.message || "Invalid or expired refresh token",
            statusCode: 401,
        }));
    }
    return res.status(200).json({
        status: 200,
        message: "Token refreshed successfully",
        data: {
            token: result.accessToken,
            refreshToken: result.refreshToken,
            merchant: result.merchant,
        },
    });
});
exports.refreshToken = refreshToken;
