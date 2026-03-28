import { applicationConfig } from "../../config";
import SendEmail from "../../utils/SendEmail";

const send_mail = new SendEmail();
const { url } = applicationConfig;

export class EmailService {
	static async sendOtpEmail(email: string, payload: any) {
		const template = "otp";
		const to = email;
		const subject = "Verification Code";
		payload.baseUrl = url.baseApi;
		payload.currentYear = new Date().getFullYear().toString();

		await send_mail.send(to, subject, template, payload);
	}
}
