import { applicationConfig } from "../../config";
import SendEmail from "../../utils/SendEmail";

const send_mail = new SendEmail();
const { url } = applicationConfig;

export class EmailService {
	static async sendOtpEmail(email: string, payload: any) {
		try {
			const template = "otp";
			const to = email;
			const subject = "Verification Code";
			payload.baseUrl = url.baseApi;

			await send_mail.send(to, subject, template, payload);
		} catch (error) {
			console.log(error);
		}
	}
}
