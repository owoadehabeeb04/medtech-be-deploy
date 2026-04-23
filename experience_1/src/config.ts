import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export type Configuration = {
	serverPort?: string | number;
	isProduction?: boolean;
	db: {
		sslEnabled: boolean;
		rejectUnauthorized: boolean;
	};
	redis: {
		url?: string;
		host?: string;
		port?: number;
		password?: string;
	};
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
	brevo: {
		apiKey: string;
		senderEmail: string;
		senderName?: string;
		baseUrl?: string;
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
	merchantIntegration?: {
		baseUrl: string;
		keyId: string;
		secret: string;
		timeoutMs: number;
		syncWorker?: {
			enabled: boolean;
			pollIntervalMs: number;
			batchSize: number;
			maxAttempts: number;
			baseRetryDelayMs: number;
			maxRetryDelayMs: number;
		};
	};
	paystack?: {
		secretKey: string;
		publicKey?: string;
		callbackUrl?: string;
	};
};

export const applicationConfig: Configuration = {
	serverPort: Number(process.env.PORT || process.env.APP_PORT) || 6200,
	isProduction: process.env.APP_ENV === "production" || false,
	db: {
		sslEnabled: (process.env.EXPERIENCE1_DB_SSL_ENABLED || process.env.DB_SSL_ENABLED) === "true",
		rejectUnauthorized: (process.env.EXPERIENCE1_DB_SSL_REJECT_UNAUTHORIZED || process.env.DB_SSL_REJECT_UNAUTHORIZED) === "true",
	},
	redis: {
		url: process.env.REDIS_URL,
		host: process.env.REDIS_HOST,
		port: +process.env.REDIS_PORT || 6379,
		password: process.env.REDIS_PASSWORD,
	},
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
	brevo: {
		apiKey: process.env.BREVO_API_KEY,
		senderEmail: process.env.BREVO_SENDER_EMAIL,
		senderName: process.env.BREVO_SENDER_NAME || "Quick Medic",
		baseUrl: process.env.BREVO_BASE_URL || "https://api.brevo.com",
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
	merchantIntegration: {
		baseUrl: process.env.MERCHANT_INTERNAL_BASE_URL || "http://localhost:3000",
		keyId: process.env.MERCHANT_INTERNAL_KEY_ID || "experience_1",
		secret: process.env.MERCHANT_INTERNAL_SECRET || "",
		timeoutMs: +process.env.MERCHANT_INTERNAL_TIMEOUT_MS || 10000,
		syncWorker: {
			enabled: process.env.DRUGSTORE_SYNC_WORKER_ENABLED !== "false",
			pollIntervalMs: +process.env.DRUGSTORE_SYNC_WORKER_INTERVAL_MS || 15000,
			batchSize: +process.env.DRUGSTORE_SYNC_WORKER_BATCH_SIZE || 10,
			maxAttempts: +process.env.DRUGSTORE_SYNC_MAX_ATTEMPTS || 8,
			baseRetryDelayMs: +process.env.DRUGSTORE_SYNC_BASE_RETRY_MS || 30000,
			maxRetryDelayMs: +process.env.DRUGSTORE_SYNC_MAX_RETRY_MS || 1800000,
		},
	},
	paystack: {
		secretKey: process.env.PAYSTACK_SECRET_KEY || "",
		publicKey: process.env.PAYSTACK_PUBLIC_KEY || "",
		callbackUrl: process.env.EXPERIENCE1_PAYSTACK_CALLBACK_URL || process.env.BASE_APP_URL || "",
	},
};
