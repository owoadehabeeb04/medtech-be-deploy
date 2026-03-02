import { CreateVerificationDTO } from "./MerchantVerification.dto";
import { MerchantVerification } from "./MerchantVerification.model";
export declare class MerchantVerificationService {
    static setSession(data: CreateVerificationDTO): Promise<MerchantVerification>;
    static getSession(sessionId: string): Promise<MerchantVerification | null>;
    static getSessionByEmail(email: string, path: string): Promise<MerchantVerification | null>;
    static delSession(sessionId: string): Promise<number>;
    static validateOTP(sessionId: string, otp: string): Promise<boolean>;
}
//# sourceMappingURL=MerchantVerification.service.d.ts.map