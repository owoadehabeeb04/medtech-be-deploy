import { applicationConfig } from "../../config";
import { CreateVerificationDTO } from "./MerchantVerification.dto";
import { MerchantVerification } from "./MerchantVerification.model";

const { otpExpiration } = applicationConfig;

export class MerchantVerificationService {
  static async setSession(data: CreateVerificationDTO): Promise<MerchantVerification> {
    return MerchantVerification.setSession(data, otpExpiration);
  }

  static async getSession(sessionId: string): Promise<MerchantVerification | null> {
    return MerchantVerification.getSession(sessionId);
  }

  static async getSessionByEmail(email: string, path: string): Promise<MerchantVerification | null> {
    return MerchantVerification.getSessionByEmail(email, path);
  }

  static async delSession(sessionId: string): Promise<number> {
    return MerchantVerification.delSession(sessionId);
  }

  static async validateOTP(sessionId: string, otp: string): Promise<boolean> {
    return MerchantVerification.validateOTP(sessionId, otp);
  }
}
