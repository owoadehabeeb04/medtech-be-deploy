export interface CreateOTPDTO {
	otp?: string;
	sessionId: string;
	phoneNumber?: string;
	email?: string;
	userType?: string;
	validated?: boolean;
	path?: string;
}
