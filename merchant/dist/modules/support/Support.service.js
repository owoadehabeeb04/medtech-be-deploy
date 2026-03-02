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
exports.SupportService = void 0;
const Email_service_1 = require("../../service/Email/Email.service");
const config_1 = require("../../config");
class SupportService {
    static contactSupport(merchantId, merchantEmail, merchantName, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { name, email, subject, message } = data;
            const supportEmail = config_1.applicationConfig.supportEmail;
            try {
                yield Email_service_1.EmailService.sendSupportRequestEmail(supportEmail, {
                    merchantName: name,
                    merchantEmail: email,
                    merchantId,
                    subject,
                    message,
                    timestamp: new Date().toISOString(),
                    supportEmail,
                });
            }
            catch (error) {
                console.error("Error sending support email to team:", error);
                throw new Error("Failed to send support message. Please try again later.");
            }
            try {
                yield Email_service_1.EmailService.sendSupportConfirmationEmail(merchantEmail, {
                    merchantName: name,
                    subject,
                    message,
                    supportEmail,
                    supportPhone: config_1.applicationConfig.supportPhone,
                    supportAddress: config_1.applicationConfig.supportAddress,
                });
            }
            catch (error) {
                console.error("Error sending confirmation email to merchant:", error);
            }
            return {
                success: true,
                message: "Your message has been sent successfully. We'll get back to you soon!",
            };
        });
    }
}
exports.SupportService = SupportService;
