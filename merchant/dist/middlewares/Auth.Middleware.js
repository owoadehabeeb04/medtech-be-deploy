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
exports.authMiddleware = void 0;
const http_status_1 = require("http-status");
const utils_1 = require("@medtech/utils");
const config_1 = require("../config");
const Merchant_model_1 = require("../modules/merchant/Merchant.model");
const authMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { manageApplicationErrors } = req.context;
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(manageApplicationErrors({
                message: "Authentication required. Please provide a valid Bearer token in the Authorization header.",
                statusCode: http_status_1.UNAUTHORIZED,
            }));
        }
        const token = authHeader.substring(7);
        // Verify token
        const decoded = (0, utils_1.verifyToken)(token, {
            secret: config_1.applicationConfig.jwt.secret,
            expiresIn: config_1.applicationConfig.jwt.expiresIn,
        });
        if (!decoded) {
            return next(manageApplicationErrors({
                message: "Invalid or expired token",
                statusCode: http_status_1.UNAUTHORIZED,
            }));
        }
        // Check if merchant exists and is active
        const merchant = yield Merchant_model_1.Merchant.findOne({
            where: { id: decoded.id, isActive: true },
        });
        if (!merchant) {
            return next(manageApplicationErrors({
                message: "Merchant not found or inactive",
                statusCode: http_status_1.UNAUTHORIZED,
            }));
        }
        // Attach merchant info to request context
        req.context.user = {
            id: merchant.id,
            email: merchant.email,
            name: merchant.fullName,
        };
        // Also attach to req.merchant for backward compatibility
        req.merchant = merchant;
        next();
    }
    catch (error) {
        console.error("Auth middleware error:", error);
        return next(manageApplicationErrors({
            message: "Authentication failed",
            statusCode: http_status_1.UNAUTHORIZED,
        }));
    }
});
exports.authMiddleware = authMiddleware;
