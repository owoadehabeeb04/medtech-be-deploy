"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
exports.MerchantVerification = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const utils_1 = require("@medtech/utils");
let MerchantVerification = class MerchantVerification extends sequelize_typescript_1.Model {
    static setSession(data_1) {
        return __awaiter(this, arguments, void 0, function* (data, otpExpirationMinutes = 10) {
            const otpExpiresAt = new Date(Date.now() + otpExpirationMinutes * 60 * 1000);
            // Deactivate old active OTPs for the same email and path
            yield this.update({ isActive: false }, { where: { email: data.email, path: data.path, isActive: true } });
            // Hash the OTP before storing
            const hashedOtp = yield (0, utils_1.hashPassword)(data.otp);
            return this.create({
                otp: hashedOtp,
                sessionId: data.sessionId,
                email: data.email,
                name: data.name || null,
                validated: false,
                path: data.path,
                isActive: true,
                expiresAt: otpExpiresAt,
            });
        });
    }
    static getSession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.findOne({
                where: { sessionId, isActive: true },
            });
        });
    }
    static getSessionByEmail(email, path) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.findOne({
                where: { email, path, isActive: true },
                order: [['createdAt', 'DESC']], // Get most recent
            });
        });
    }
    static delSession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const [affectedCount] = yield this.update({ isActive: false }, {
                where: { sessionId, isActive: true },
            });
            return affectedCount;
        });
    }
    static validateOTP(sessionId, otp) {
        return __awaiter(this, void 0, void 0, function* () {
            const record = yield this.findOne({
                where: { sessionId, isActive: true },
            });
            if (!record)
                return false;
            // Check expiry
            if (record.expiresAt.getTime() < Date.now()) {
                record.isActive = false;
                yield record.save();
                return false; // expired
            }
            // Verify the OTP by comparing hashed input with stored hash
            const isValidOtp = yield (0, utils_1.verifyPassword)(otp, record.otp);
            if (!isValidOtp) {
                return false;
            }
            record.validated = true;
            record.otp = ""; // Clear OTP after successful verification
            yield record.save();
            return true;
        });
    }
};
exports.MerchantVerification = MerchantVerification;
__decorate([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)
], MerchantVerification.prototype, "otp", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)
], MerchantVerification.prototype, "sessionId", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)
], MerchantVerification.prototype, "email", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)
], MerchantVerification.prototype, "name", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)
], MerchantVerification.prototype, "validated", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)
], MerchantVerification.prototype, "path", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)
], MerchantVerification.prototype, "isActive", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE)
], MerchantVerification.prototype, "expiresAt", void 0);
exports.MerchantVerification = MerchantVerification = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "merchant_verifications",
        timestamps: true,
    })
], MerchantVerification);
