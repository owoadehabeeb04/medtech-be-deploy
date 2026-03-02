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
exports.EmailService = void 0;
const utils_1 = require("@medtech/utils");
const config_1 = require("../../config");
const path = __importStar(require("path"));
const { baseUrl, supportEmail, smtp } = config_1.applicationConfig;
const emailTemplatePath = path.resolve(__dirname, "../../view/emails/");
console.log("Initializing EmailService with template path:", emailTemplatePath);
console.log("SMTP Config:", {
    host: smtp.host ? "configured" : "missing",
    user: smtp.user ? "configured" : "missing",
    port: smtp.port,
    hasPassword: !!smtp.pass
});
const send_mail = new utils_1.SendEmail(smtp, emailTemplatePath);
class EmailService {
    static sendSignupOtpEmail(email, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const template = "signup-otp";
                const subject = "Signup Verification Code";
                payload.baseUrl = baseUrl;
                payload.supportEmail = supportEmail;
                payload.currentYear = new Date().getFullYear().toString();
                console.log("Attempting to send signup OTP email to:", email);
                yield send_mail.send(email, subject, template, payload);
                console.log("Signup OTP email sent successfully to:", email);
            }
            catch (error) {
                console.error("Error sending signup OTP email:", error);
                console.error("Error details:", { email, errorMessage: error === null || error === void 0 ? void 0 : error.message, errorCode: error === null || error === void 0 ? void 0 : error.code });
                throw error;
            }
        });
    }
    static sendResetPasswordOtpEmail(email, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const template = "reset-password-otp";
                const subject = "Password Reset Verification Code";
                payload.baseUrl = baseUrl;
                payload.supportEmail = supportEmail;
                payload.currentYear = new Date().getFullYear().toString();
                console.log("Attempting to send reset password OTP email to:", email);
                yield send_mail.send(email, subject, template, payload);
                console.log("Reset password OTP email sent successfully to:", email);
            }
            catch (error) {
                console.error("Error sending reset password OTP email:", error);
                console.error("Error details:", { email, errorMessage: error === null || error === void 0 ? void 0 : error.message, errorCode: error === null || error === void 0 ? void 0 : error.code });
                throw error;
            }
        });
    }
    static sendSupportConfirmationEmail(email, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const template = "support-confirmation";
                const subject = "We've Received Your Message";
                payload.baseUrl = baseUrl;
                payload.supportEmail = supportEmail;
                payload.currentYear = new Date().getFullYear().toString();
                console.log("Attempting to send support confirmation email to:", email);
                yield send_mail.send(email, subject, template, payload);
                console.log("Support confirmation email sent successfully to:", email);
            }
            catch (error) {
                console.error("Error sending support confirmation email:", error);
                console.error("Error details:", { email, errorMessage: error === null || error === void 0 ? void 0 : error.message, errorCode: error === null || error === void 0 ? void 0 : error.code });
                throw error;
            }
        });
    }
    static sendSupportRequestEmail(toEmail, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const template = "support-request";
                const subject = `[Support Request] ${payload.subject}`;
                payload.baseUrl = baseUrl;
                payload.supportEmail = supportEmail;
                payload.currentYear = new Date().getFullYear().toString();
                console.log("Attempting to send support request email to:", toEmail);
                yield send_mail.send(toEmail, subject, template, payload);
                console.log("Support request email sent successfully to:", toEmail);
            }
            catch (error) {
                console.error("Error sending support request email:", error);
                console.error("Error details:", { toEmail, errorMessage: error === null || error === void 0 ? void 0 : error.message, errorCode: error === null || error === void 0 ? void 0 : error.code });
                throw error;
            }
        });
    }
}
exports.EmailService = EmailService;
