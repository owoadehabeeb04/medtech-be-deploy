import * as dotenv from "dotenv";
dotenv.config();

export type Configuration = {
	serverPort?: string | number;
	isProduction?: boolean;
	tokenSecret: string;
	refreshTokenSecret: string;
	tokenExpirationTime: number;
	refreshTokenExpirationTime: number;
	bcryptSaltRound?: number;
	redisExpirationTime?: number;
	connectionTimeout?: number;
	rateLimitOptions?: {
		duration: number;
		maxRequestsPerMinute: number;
	};
	encryption: {
		enabled: boolean;
		algorithm: string;
		keyLength: number;
		ivLength: number;
		password?: string;
		salt?: string;
	};
	mailOptions: {
		username: string;
		password: string;
		port: number;
		host: string;
		fromEmail?: string;
		fromName?: string;
		otpExpiresIn?: number; // Optional, if needed for OTP emails
	};
	awsOptions: {
		region: string;
		accessKey: string;
		secretKey: string;
		s3BucketName: string;
	};
	otpExpiration?: number;
	url: {
		baseApi: string;
		baseApp: string;
	};
	googleOauthOption?: {
		clientId: string;
		projectName: string;
		authUri: string;
		tokenUri: string;
		authProviderX509CertUrl: string;
		clientSecret: string;
		redirectUri: string;
		javascriptOrigins: string;
	};
};

export const applicationConfig: Configuration = {
	serverPort: Number(process.env.APP_PORT) || 6200,
	isProduction: process.env.APP_ENV === "production" || false,
	tokenSecret: process.env.JWT_SECRET,
	refreshTokenSecret: process.env.REF_JWT_SECRET,
	tokenExpirationTime: +process.env.JWT_EXP_TIME || 900,
	refreshTokenExpirationTime: +process.env.REF_JWT_EXP_TIME || 3600,
	redisExpirationTime: +process.env.REDIS_EXP_TIME || 300,
	bcryptSaltRound: +process.env.BCRYPT_SALT_ROUNDS || 10,
	connectionTimeout: +process.env.CONNECTION_TIMEOUT || 5000,
	rateLimitOptions: {
		duration: +process.env.RATE_LIMIT_DURATION || 60000,
		maxRequestsPerMinute: +process.env.RATE_LIMIT_MAX_REQUESTS || 100,
	},
	mailOptions: {
		username: process.env.MAIL_USER,
		password: process.env.MAIL_PASS,
		port: +process.env.MAIL_PORT,
		host: process.env.MAIL_HOST,
		fromEmail: process.env.MAIL_FROM_EMAIL,
		fromName: process.env.MAIL_FROM_EMAIL_NAME,
	},
	awsOptions: {
		region: process.env.AWS_DEFAULT_REGION,
		accessKey: process.env.AWS_ACCESS_KEY_ID,
		secretKey: process.env.AWS_SECRET_ACCESS_KEY,
		s3BucketName: process.env.AWS_BUCKET,
	},
	encryption: {
		enabled: process.env.ENCRYPTION_ENABLED === "true" || false,
		algorithm: process.env.ENCRYPTION_ALGORITHM,
		keyLength: +process.env.ENCRYPTION_KEY_LENGTH || 32,
		ivLength: +process.env.ENCRYPTION_IV_LENGTH || 16,
		password: process.env.ENCRYPTION_PASSWORD,
		salt: process.env.ENCRYPTION_SALT,
	},
	otpExpiration: +process.env.OTP_EXPIRATION || 15,
	url: {
		baseApi: process.env.BASE_API_URL || "http://localhost:6200",
		baseApp: process.env.BASE_APP_URL || "http://localhost:3000",
	},
	googleOauthOption: {
		clientId: process.env.GOOGLE_CLIENT_ID,
		projectName: process.env.GOOGLE_PROJECT_NAME,
		authUri: process.env.GOOGLE_AUTH_URI,
		tokenUri: process.env.GOOGLE_TOKEN_URI,
		authProviderX509CertUrl: process.env.auth_provider_x509_cert_url,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		redirectUri: process.env.GOOGLE_REDIRECT_URI,
		javascriptOrigins: process.env.javascript_origins,
	},
};
