export declare class RefreshTokenService {
    static createRefreshToken(merchantId: string, deviceInfo?: string, ipAddress?: string): Promise<{
        refreshToken: string;
        tokenId: string;
    }>;
    static refreshAccessToken(refreshTokenString: string): Promise<{
        accessToken: string;
        refreshToken: string;
        merchant: any;
    }>;
    static revokeRefreshToken(tokenId: string, merchantId: string): Promise<void>;
    static revokeAllRefreshTokens(merchantId: string): Promise<void>;
    static cleanupExpiredTokens(): Promise<number>;
}
//# sourceMappingURL=RefreshToken.service.d.ts.map