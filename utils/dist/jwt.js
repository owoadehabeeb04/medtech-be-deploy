"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.generateRefreshToken = exports.verifyOTPFlowToken = exports.verifyToken = exports.generateOTPFlowToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const generateToken = (payload, config) => {
    if (!config.secret) {
        throw new Error("JWT secret is not configured");
    }
    return jsonwebtoken_1.default.sign(payload, config.secret, {
        expiresIn: config.expiresIn,
    });
};
exports.generateToken = generateToken;
const generateOTPFlowToken = (payload, config) => {
    if (!config.secret) {
        throw new Error("JWT secret is not configured");
    }
    const expiration = config.otpExpiration || 10;
    return jsonwebtoken_1.default.sign(payload, config.secret, {
        expiresIn: `${expiration}m`,
    });
};
exports.generateOTPFlowToken = generateOTPFlowToken;
const verifyToken = (token, config) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config.secret);
        return decoded;
    }
    catch (error) {
        return null;
    }
};
exports.verifyToken = verifyToken;
const verifyOTPFlowToken = (token, config) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config.secret);
        return decoded;
    }
    catch (error) {
        return null;
    }
};
exports.verifyOTPFlowToken = verifyOTPFlowToken;
const generateRefreshToken = (payload, config) => {
    if (!config.refreshSecret || config.refreshSecret.trim() === "" || config.refreshSecret === "change-me-refresh-token-secret") {
        throw new Error("Refresh token secret is not configured. Please set JWT_REFRESH_SECRET environment variable.");
    }
    return jsonwebtoken_1.default.sign(payload, config.refreshSecret, {
        expiresIn: config.refreshExpiresIn || "30d",
    });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyRefreshToken = (token, config) => {
    try {
        if (!config.refreshSecret || config.refreshSecret.trim() === "" || config.refreshSecret === "change-me-refresh-token-secret") {
            throw new Error("Refresh token secret is not configured. Please set JWT_REFRESH_SECRET environment variable.");
        }
        const decoded = jsonwebtoken_1.default.verify(token, config.refreshSecret);
        return decoded;
    }
    catch (error) {
        return null;
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
