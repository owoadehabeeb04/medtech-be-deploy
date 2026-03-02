export interface SignupDTO {
    email: string;
    name: string;
}
export interface VerifyOtpDTO {
    email: string;
    otp: string;
}
export interface CompleteSignupDTO {
    email: string;
    businessName: string;
    phoneNumber: string;
    password: string;
    confirmPassword: string;
    licenseUrl?: string;
}
export interface LoginDTO {
    email: string;
    password: string;
}
export interface ForgotPasswordDTO {
    email: string;
}
export interface ResetPasswordDTO {
    email: string;
    newPassword: string;
    confirmPassword: string;
}
//# sourceMappingURL=MerchantAuth.dto.d.ts.map