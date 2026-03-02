export interface JWTPayload {
    id: string;
    email: string;
    type: "merchant";
}
export interface OTPFlowPayload {
    email: string;
    name?: string;
    path: "signup" | "reset-password";
    step: "otp-sent" | "otp-verified";
    otpHash?: string;
}
export interface JWTConfig {
    secret: string;
    expiresIn: string;
    otpExpiration?: number;
    refreshSecret?: string;
    refreshExpiresIn?: string;
}
export declare const generateToken: (payload: JWTPayload, config: JWTConfig) => string;
export declare const generateOTPFlowToken: (payload: OTPFlowPayload, config: JWTConfig) => string;
export declare const verifyToken: (token: string, config: JWTConfig) => JWTPayload | null;
export declare const verifyOTPFlowToken: (token: string, config: JWTConfig) => OTPFlowPayload | null;
export interface RefreshTokenPayload {
    id: string;
    email: string;
    type: "merchant";
    tokenId: string;
}
export declare const generateRefreshToken: (payload: RefreshTokenPayload, config: JWTConfig) => string;
export declare const verifyRefreshToken: (token: string, config: JWTConfig) => RefreshTokenPayload | null;
//# sourceMappingURL=jwt.d.ts.map