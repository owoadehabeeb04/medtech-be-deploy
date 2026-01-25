import { EVENT_CONSTANT } from "../constants/event_type";
import { EmailService } from "../service/Email/Email.service";
import { AppEventEmitter } from "./eventEmitter";

export default function eventListeners() {
	console.log("*************** event listeners ****************", new Date());

	AppEventEmitter.on(EVENT_CONSTANT.OTP_REQUESTED, async (email: string, payload: any) => {
		await EmailService.sendOtpEmail(email, payload);
	});
}
