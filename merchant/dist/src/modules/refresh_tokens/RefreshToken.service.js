"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.RefreshTokenService = void 0;
const RefreshToken_model_1 = require("./RefreshToken.model");
const Merchant_model_1 = require("../merchant/Merchant.model");
const StoreDetails_model_1 = require("../store_details/StoreDetails.model");
const PaymentDetails_model_1 = require("../payment_details/PaymentDetails.model");
const MerchantSettings_model_1 = require("../merchant_settings/MerchantSettings.model");
const utils_1 = require("@medtech/utils");
const utils_2 = require("@medtech/utils");
const config_1 = require("../../config");
const sequelize_1 = require("sequelize");
const crypto = __importStar(require("crypto"));
class RefreshTokenService {
    static createRefreshToken(merchantId, deviceInfo, ipAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            const tokenString = crypto.randomBytes(64).toString("hex");
            const hashedToken = yield (0, utils_1.hashPassword)(tokenString);
            const refreshTokenRecord = yield RefreshToken_model_1.RefreshToken.create({
                merchantId,
                token: hashedToken,
                expiresAt,
                isActive: true,
                deviceInfo: deviceInfo || null,
                ipAddress: ipAddress || null,
            });
            const merchant = yield Merchant_model_1.Merchant.findByPk(merchantId, { attributes: ["email"] });
            const jwtRefreshToken = (0, utils_2.generateRefreshToken)({
                id: merchantId,
                email: (merchant === null || merchant === void 0 ? void 0 : merchant.email) || "",
                type: "merchant",
                tokenId: refreshTokenRecord.id,
            }, {
                secret: config_1.applicationConfig.jwt.secret,
                expiresIn: config_1.applicationConfig.jwt.expiresIn,
                refreshSecret: config_1.applicationConfig.jwt.refreshSecret,
                refreshExpiresIn: config_1.applicationConfig.jwt.refreshExpiresIn,
            });
            return {
                refreshToken: jwtRefreshToken,
                tokenId: refreshTokenRecord.id,
            };
        });
    }
    static refreshAccessToken(refreshTokenString) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const decoded = (0, utils_2.verifyRefreshToken)(refreshTokenString, {
                secret: config_1.applicationConfig.jwt.secret,
                expiresIn: config_1.applicationConfig.jwt.expiresIn,
                refreshSecret: config_1.applicationConfig.jwt.refreshSecret,
                refreshExpiresIn: config_1.applicationConfig.jwt.refreshExpiresIn,
            });
            if (!decoded || !decoded.tokenId) {
                throw new Error("Invalid refresh token");
            }
            const refreshTokenRecord = yield RefreshToken_model_1.RefreshToken.findOne({
                where: {
                    id: decoded.tokenId,
                    merchantId: decoded.id,
                    isActive: true,
                },
                include: [{ model: Merchant_model_1.Merchant, as: "merchant" }],
            });
            if (!refreshTokenRecord) {
                throw new Error("Refresh token not found or revoked");
            }
            if (refreshTokenRecord.isExpired) {
                yield refreshTokenRecord.update({ isActive: false });
                throw new Error("Refresh token has expired");
            }
            const merchant = yield Merchant_model_1.Merchant.findByPk(decoded.id, {
                include: [
                    { model: StoreDetails_model_1.StoreDetails, as: "storeDetails" },
                    { model: PaymentDetails_model_1.PaymentDetails, as: "paymentDetails" },
                    { model: MerchantSettings_model_1.MerchantSettings, as: "settings" },
                ],
            });
            if (!merchant || !merchant.isActive) {
                throw new Error("Merchant not found or inactive");
            }
            const accessToken = (0, utils_2.generateToken)({
                id: merchant.id,
                email: merchant.email,
                type: "merchant",
            }, {
                secret: config_1.applicationConfig.jwt.secret,
                expiresIn: config_1.applicationConfig.jwt.expiresIn,
                otpExpiration: config_1.applicationConfig.otpExpiration,
            });
            return {
                accessToken,
                refreshToken: refreshTokenString,
                merchant: {
                    id: merchant.id,
                    email: merchant.email,
                    firstName: merchant.firstName,
                    lastName: merchant.lastName,
                    fullName: merchant.fullName,
                    businessName: (_a = merchant.storeDetails) === null || _a === void 0 ? void 0 : _a.businessName,
                    phoneNumber: merchant.phoneNumber,
                    isVerified: merchant.isVerified,
                },
            };
        });
    }
    static revokeRefreshToken(tokenId, merchantId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield RefreshToken_model_1.RefreshToken.update({ isActive: false }, {
                where: {
                    id: tokenId,
                    merchantId,
                },
            });
        });
    }
    static revokeAllRefreshTokens(merchantId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield RefreshToken_model_1.RefreshToken.update({ isActive: false }, {
                where: {
                    merchantId,
                    isActive: true,
                },
            });
        });
    }
    static cleanupExpiredTokens() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield RefreshToken_model_1.RefreshToken.update({ isActive: false }, {
                where: {
                    expiresAt: {
                        [sequelize_1.Op.lt]: new Date(),
                    },
                    isActive: true,
                },
            });
            return result[0];
        });
    }
}
exports.RefreshTokenService = RefreshTokenService;
