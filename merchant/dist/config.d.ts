export declare const applicationConfig: {
    nodeEnv: string;
    serverPort: number;
    timezone: string;
    postgres: {
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
        logging: boolean;
    };
    jwt: {
        secret: string;
        expiresIn: string;
        refreshSecret: string;
        refreshExpiresIn: string;
    };
    redis: {
        host: string;
        port: number;
        password: string;
    };
    rateLimitOptions: {
        duration: number;
        maxRequestsPerMinute: number;
    };
    encryption: {
        enabled: boolean;
        password: string;
    };
    smtp: {
        host: string;
        port: number;
        user: string;
        pass: string;
    };
    aws: {
        region: string;
        accessKey: string;
        secretKey: string;
        s3BucketName: string;
    };
    cloudinary: {
        cloudName: string;
        apiKey: string;
        apiSecret: string;
        uploadPreset: string;
    };
    paystack: {
        secretKey: string;
        publicKey: string;
    };
    otpExpiration: number;
    baseUrl: string;
    supportEmail: string;
    supportPhone: string;
    supportAddress: string;
    isProduction: boolean;
};
//# sourceMappingURL=config.d.ts.map