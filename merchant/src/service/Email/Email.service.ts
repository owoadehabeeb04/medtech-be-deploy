import { SendEmail } from "@medtech/utils";
import { applicationConfig } from "../../config";
import * as path from "path";

const { baseUrl, supportEmail, smtp } = applicationConfig;
const emailTemplatePath = path.resolve(__dirname, "../../view/emails/");

console.log("Initializing EmailService with template path:", emailTemplatePath);
console.log("SMTP Config:", { 
  host: smtp.host ? "configured" : "missing", 
  user: smtp.user ? "configured" : "missing", 
  port: smtp.port,
  hasPassword: !!smtp.pass 
});

const send_mail = new SendEmail(smtp, emailTemplatePath);

export class EmailService {
  static async sendSignupOtpEmail(email: string, payload: any) {
    try {
      const template = "signup-otp";
      const subject = "Signup Verification Code";
      payload.baseUrl = baseUrl;
      payload.supportEmail = supportEmail;
      payload.currentYear = new Date().getFullYear().toString();

      console.log("Attempting to send signup OTP email to:", email);
      await send_mail.send(email, subject, template, payload);
      console.log("Signup OTP email sent successfully to:", email);
    } catch (error: any) {
      console.error("Error sending signup OTP email:", error);
      console.error("Error details:", { email, errorMessage: error?.message, errorCode: error?.code });
      throw error;
    }
  }

  static async sendResetPasswordOtpEmail(email: string, payload: any) {
    try {
      const template = "reset-password-otp";
      const subject = "Password Reset Verification Code";
      payload.baseUrl = baseUrl;
      payload.supportEmail = supportEmail;
      payload.currentYear = new Date().getFullYear().toString();

      console.log("Attempting to send reset password OTP email to:", email);
      await send_mail.send(email, subject, template, payload);
      console.log("Reset password OTP email sent successfully to:", email);
    } catch (error: any) {
      console.error("Error sending reset password OTP email:", error);
      console.error("Error details:", { email, errorMessage: error?.message, errorCode: error?.code });
      throw error;
    }
  }

  static async sendSupportConfirmationEmail(email: string, payload: any) {
    try {
      const template = "support-confirmation";
      const subject = "We've Received Your Message";
      payload.baseUrl = baseUrl;
      payload.supportEmail = supportEmail;
      payload.currentYear = new Date().getFullYear().toString();

      console.log("Attempting to send support confirmation email to:", email);
      await send_mail.send(email, subject, template, payload);
      console.log("Support confirmation email sent successfully to:", email);
    } catch (error: any) {
      console.error("Error sending support confirmation email:", error);
      console.error("Error details:", { email, errorMessage: error?.message, errorCode: error?.code });
      throw error;
    }
  }

  static async sendSupportRequestEmail(toEmail: string, payload: any) {
    try {
      const template = "support-request";
      const subject = `[Support Request] ${payload.subject}`;
      payload.baseUrl = baseUrl;
      payload.supportEmail = supportEmail;
      payload.currentYear = new Date().getFullYear().toString();

      console.log("Attempting to send support request email to:", toEmail);
      await send_mail.send(toEmail, subject, template, payload);
      console.log("Support request email sent successfully to:", toEmail);
    } catch (error: any) {
      console.error("Error sending support request email:", error);
      console.error("Error details:", { toEmail, errorMessage: error?.message, errorCode: error?.code });
      throw error;
    }
  }
}
