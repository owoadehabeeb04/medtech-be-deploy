import { Model } from "sequelize-typescript";
export declare class MerchantVerification extends Model<MerchantVerification> {
    otp: string;
    sessionId: string;
    email: string;
    name: string;
    validated: boolean;
    path: string;
    isActive: boolean;
    expiresAt: Date;
    static setSession(data: {
        otp: string;
        sessionId: string;
        email: string;
        path: string;
        name?: string;
    }, otpExpirationMinutes?: number): Promise<MerchantVerification>;
    static getSession(sessionId: string): Promise<MerchantVerification | null>;
    static getSessionByEmail(email: string, path: string): Promise<MerchantVerification | null>;
    static delSession(sessionId: string): Promise<number>;
    static validateOTP(sessionId: string, otp: string): Promise<boolean>;
}
//# sourceMappingURL=MerchantVerification.model.d.ts.map