import { SendEmail } from "@medtech/utils";
import { applicationConfig } from "../../config";
import * as path from "path";

const { baseUrl, supportEmail, smtp } = applicationConfig;
const emailTemplatePath = path.resolve(__dirname, "../../view/emails/");

const send_mail = new SendEmail(smtp, emailTemplatePath);

export class EmailService {
  static async sendSignupOtpEmail(email: string, payload: any) {
    try {
      const template = "signup-otp";
      const subject = "Signup Verification Code";
      payload.baseUrl = baseUrl;
      payload.supportEmail = supportEmail;
      payload.currentYear = new Date().getFullYear().toString();

      await send_mail.send(email, subject, template, payload);
    } catch (error: any) {
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

      await send_mail.send(email, subject, template, payload);
    } catch (error: any) {
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

      await send_mail.send(email, subject, template, payload);
    } catch (error: any) {
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

      await send_mail.send(toEmail, subject, template, payload);
    } catch (error: any) {
      throw error;
    }
  }
}
