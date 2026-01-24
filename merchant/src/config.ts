import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const applicationConfig = {
  nodeEnv: process.env.NODE_ENV || "development",
  serverPort: parseInt(process.env.PORT || "3000", 10),
  timezone: process.env.TZ || "Africa/Lagos",
  
  postgres: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "merchant_db",
    logging: process.env.DB_LOG === "true",
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || "change-me-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "change-me-refresh-token-secret",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d", // 30 days
  },
  
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || "",
  },
  
  rateLimitOptions: {
    duration: parseInt(process.env.RATE_LIMIT_DURATION || "60000", 10),
    maxRequestsPerMinute: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  },
  
  encryption: {
    enabled: process.env.ENCRYPTION_ENABLED === "true",
    password: process.env.ENCRYPTION_PASSWORD || "",
  },
  
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  
  aws: {
    region: process.env.AWS_DEFAULT_REGION || "",
    accessKey: process.env.AWS_ACCESS_KEY_ID || "",
    secretKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    s3BucketName: process.env.AWS_BUCKET || "",
  },
  
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || "",
  },
  
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || "",
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || "",
  },
  
  otpExpiration: parseInt(process.env.OTP_EXPIRATION || "10", 10), // minutes
  
  baseUrl: process.env.BASE_API_URL || "http://localhost:3000",
  
  supportEmail: process.env.SUPPORT_EMAIL || "support@meditechhealth.ng",
  supportPhone: process.env.SUPPORT_PHONE || "+2348051114444",
  supportAddress: process.env.SUPPORT_ADDRESS || "14 Haruna Ishola Street, Lagos. Nigeria",
  
  isProduction: process.env.NODE_ENV === "production",
};
