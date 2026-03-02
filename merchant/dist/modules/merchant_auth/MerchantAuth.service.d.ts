import { Request } from "express";
import { SignupDTO, VerifyOtpDTO, CompleteSignupDTO, LoginDTO, ForgotPasswordDTO, ResetPasswordDTO } from "./MerchantAuth.dto";
export interface ApiResponse {
    status: boolean;
    code: number;
    message: string;
    data?: any;
}
export declare class MerchantAuthService {
    static signup(data: SignupDTO, req: Request): Promise<ApiResponse>;
    static verifyOtp(data: VerifyOtpDTO): Promise<ApiResponse>;
    static completeSignup(data: CompleteSignupDTO): Promise<ApiResponse>;
    static login(data: LoginDTO, req?: Request): Promise<ApiResponse>;
    static forgotPassword(data: ForgotPasswordDTO, req: Request): Promise<ApiResponse>;
    static verifyResetOtp(data: VerifyOtpDTO): Promise<ApiResponse>;
    static resetPassword(data: ResetPasswordDTO): Promise<ApiResponse>;
}
//# sourceMappingURL=MerchantAuth.service.d.ts.map