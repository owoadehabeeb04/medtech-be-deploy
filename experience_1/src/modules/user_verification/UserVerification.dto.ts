import { OTP_PURPOSE } from "../../constants/constant";

export interface CreateOTPDTO {
	otp?: string;
	sessionId: string;
	phoneNumber?: string;
	email?: string;
	userType?: string;
	validated?: boolean;
	path?: string;
	purpose?: OTP_PURPOSE;
	payload?: Record<string, any>;
}
