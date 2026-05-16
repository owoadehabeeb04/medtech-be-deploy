import { ContactSupportDTO } from "./Support.dto";
import { EmailService } from "../../service/Email/Email.service";
import { applicationConfig } from "../../config";

export class SupportService {
  static async contactSupport(
    merchantId: string,
    merchantEmail: string,
    merchantName: string,
    data: ContactSupportDTO
  ): Promise<{ success: boolean; message: string }> {
    const { name, email, subject, message } = data;
    const supportEmail = applicationConfig.supportEmail;

    try {
      await EmailService.sendSupportRequestEmail(supportEmail, {
        merchantName: name,
        merchantEmail: email,
        merchantId,
        subject,
        message,
        timestamp: new Date().toISOString(),
        supportEmail,
      });
    } catch (error) {
      throw new Error("Failed to send support message. Please try again later.");
    }

    try {
      await EmailService.sendSupportConfirmationEmail(merchantEmail, {
        merchantName: name,
        subject,
        message,
        supportEmail,
        supportPhone: applicationConfig.supportPhone,
        supportAddress: applicationConfig.supportAddress,
      });
    } catch (error) {
      console.error("Failed to send confirmation email to merchant:", error);
    }

    return {
      success: true,
      message: "Your message has been sent successfully. We'll get back to you soon!",
    };
  }
}
