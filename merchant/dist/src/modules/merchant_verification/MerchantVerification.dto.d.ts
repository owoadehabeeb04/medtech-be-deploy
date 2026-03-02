export interface CreateVerificationDTO {
    otp: string;
    sessionId: string;
    email: string;
    path: "signup" | "reset-password";
    name?: string;
}
//# sourceMappingURL=MerchantVerification.dto.d.ts.map