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
exports.MerchantVerificationService = void 0;
const config_1 = require("../../config");
const MerchantVerification_model_1 = require("./MerchantVerification.model");
const { otpExpiration } = config_1.applicationConfig;
class MerchantVerificationService {
    static setSession(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return MerchantVerification_model_1.MerchantVerification.setSession(data, otpExpiration);
        });
    }
    static getSession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            return MerchantVerification_model_1.MerchantVerification.getSession(sessionId);
        });
    }
    static getSessionByEmail(email, path) {
        return __awaiter(this, void 0, void 0, function* () {
            return MerchantVerification_model_1.MerchantVerification.getSessionByEmail(email, path);
        });
    }
    static delSession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            return MerchantVerification_model_1.MerchantVerification.delSession(sessionId);
        });
    }
    static validateOTP(sessionId, otp) {
        return __awaiter(this, void 0, void 0, function* () {
            return MerchantVerification_model_1.MerchantVerification.validateOTP(sessionId, otp);
        });
    }
}
exports.MerchantVerificationService = MerchantVerificationService;
