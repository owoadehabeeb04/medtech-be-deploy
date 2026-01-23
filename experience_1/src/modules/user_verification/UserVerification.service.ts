import { applicationConfig } from "../../config";
import { CreateOTPDTO } from "./UserVerification.dto";
import { UserVerification } from "./UserVerification.model";

const { otpExpiration } = applicationConfig;

export class UserVerificationService {
	static async setSession(data: CreateOTPDTO): Promise<UserVerification> {
		return UserVerification.setSession(data, otpExpiration);
	}

	static async getSession(sessionId: string): Promise<UserVerification | null> {
		return UserVerification.getSession(sessionId);
	}

	static async delSession(sessionId: string): Promise<[affectedCount: number]> {
		return UserVerification.delSession(sessionId);
	}

	static async validateOTP(sessionId: string, otp: string): Promise<boolean> {
		return UserVerification.validateOTP(sessionId, otp);
	}

	static async updateSession(sessionId: string, data: Partial<CreateOTPDTO>) {
		return UserVerification.updateSession(sessionId, data);
	}
}
