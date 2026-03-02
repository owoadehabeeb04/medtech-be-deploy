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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer = __importStar(require("nodemailer"));
const nodemailer_express_handlebars_1 = __importDefault(require("nodemailer-express-handlebars"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class SendEmail {
    constructor(smtpConfig, emailTemplatePath) {
        this.user = smtpConfig.user;
        this.host = smtpConfig.host;
        this.port = smtpConfig.port;
        this.password = smtpConfig.pass;
        if (this.host && this.user && this.password) {
            const isGmail = this.host.includes("gmail.com");
            const emailConfig = {
                host: this.host,
                port: this.port,
                auth: { user: this.user, pass: this.password },
                secure: isGmail && this.port === 465,
                debug: true,
            };
            if (isGmail && this.port === 587) {
                emailConfig.requireTLS = true;
                emailConfig.tls = {
                    rejectUnauthorized: false,
                };
            }
            else if (!isGmail) {
                emailConfig.secure = false;
                emailConfig.tls = {
                    rejectUnauthorized: false,
                };
            }
            this.transporter = nodemailer.createTransport(emailConfig);
            console.log("SMTP transporter configured:", {
                host: this.host,
                port: this.port,
                secure: emailConfig.secure,
                isGmail
            });
        }
        else {
            console.warn("SMTP not fully configured - creating empty transporter");
            this.transporter = nodemailer.createTransport({});
        }
        // Use provided email template path or try to find it
        let emailPath = emailTemplatePath;
        if (!emailPath) {
            // Try merchant path first, then fallback to utils path
            const merchantEmailPath = path.resolve(__dirname, "../../merchant/src/view/emails/");
            const utilsEmailPath = path.resolve(__dirname, "../view/emails/");
            emailPath = fs.existsSync(merchantEmailPath) ? merchantEmailPath : utilsEmailPath;
        }
        this.handlebarOptions = {
            viewEngine: {
                partialsDir: emailPath,
                defaultLayout: "",
            },
            viewPath: emailPath,
        };
        if (!fs.existsSync(emailPath)) {
            console.error("Email template path does not exist:", emailPath);
            throw new Error(`Email template path does not exist: ${emailPath}`);
        }
        console.log("Email templates initialized with path:", emailPath);
        this.transporter.use("compile", (0, nodemailer_express_handlebars_1.default)(this.handlebarOptions));
    }
    send(to, subject, template, data, cc) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.host || !this.user || !this.password) {
                const errorMsg = "SMTP not configured. Email not sent. Configure SMTP_HOST, SMTP_USER, and SMTP_PASS in .env";
                console.error(errorMsg);
                console.error("Current SMTP config:", { host: this.host, user: this.user, hasPassword: !!this.password });
                throw new Error(errorMsg);
            }
            if (Array.isArray(to)) {
                to = to.filter(email => !email.includes("@example.com"));
                if (to.length === 0) {
                    throw new Error("All recipient emails are invalid (@example.com addresses are not real)");
                }
            }
            else if (to.includes("@example.com")) {
                throw new Error("Cannot send email to @example.com - this is not a real email domain. Please use a real email address.");
            }
            if (!this.handlebarOptions || !this.handlebarOptions.viewPath) {
                const errorMsg = "Email template path not configured";
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
            this.mailOptions = {
                from: `"Quick Medic" <${this.user}>`,
                to,
                subject,
                template,
                context: data,
                cc,
            };
            return new Promise((resolve, reject) => {
                this.transporter.sendMail(this.mailOptions, function (error, info) {
                    if (error) {
                        console.error("Email send error:", error);
                        const errorWithCode = error;
                        console.error("Email details:", {
                            to,
                            subject,
                            template,
                            errorCode: errorWithCode.code,
                            errorMessage: error.message,
                            response: errorWithCode.response,
                            responseCode: errorWithCode.responseCode
                        });
                        if (errorWithCode.code === "EAUTH") {
                            console.error("Authentication failed. Check your SMTP credentials (username/password).");
                            console.error("For Gmail, make sure you're using an App Password, not your regular password.");
                        }
                        return reject(error);
                    }
                    console.log("Email sent successfully:", {
                        to,
                        subject,
                        messageId: info === null || info === void 0 ? void 0 : info.messageId,
                        accepted: info === null || info === void 0 ? void 0 : info.accepted,
                        rejected: info === null || info === void 0 ? void 0 : info.rejected,
                        response: info === null || info === void 0 ? void 0 : info.response
                    });
                    if ((info === null || info === void 0 ? void 0 : info.rejected) && info.rejected.length > 0) {
                        console.warn("Some recipients were rejected:", info.rejected);
                    }
                    resolve(to);
                });
            });
        });
    }
}
exports.default = SendEmail;
