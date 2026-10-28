import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

const envCandidates = [
  path.resolve(process.cwd(), "merchant/.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../.env"),
];

const envPath = envCandidates.find((candidate) => fs.existsSync(candidate));
dotenv.config(envPath ? { path: envPath } : undefined);

const parsedDrugstoreCommissionRate = Number(
  process.env.DRUGSTORE_ANALYTICS_COMMISSION_RATE || "0.1"
);
const drugstoreCommissionRate = Number.isFinite(parsedDrugstoreCommissionRate)
  ? Math.min(Math.max(parsedDrugstoreCommissionRate, 0), 1)
  : 0.1;
const allowedPaymentReturnOrigins = (
  process.env.ALLOWED_PAYMENT_RETURN_ORIGINS ||
  process.env.BASE_APP_URL ||
  ""
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export const applicationConfig = {
  nodeEnv: process.env.NODE_ENV || "development",
  serverPort: parseInt(process.env.PORT || "3000", 10),
  timezone: process.env.TZ || "Africa/Lagos",
  allowedPaymentReturnOrigins,
  
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

  // Service-to-service calls use a separate bucket from public traffic. Internal
  // callers are authenticated with HMAC before this limiter is reached.
  internalRateLimitOptions: {
    duration: parseInt(
      process.env.INTERNAL_RATE_LIMIT_DURATION || process.env.RATE_LIMIT_DURATION || "60000",
      10
    ),
    maxRequestsPerMinute: parseInt(process.env.INTERNAL_RATE_LIMIT_MAX_REQUESTS || "1000", 10),
  },
  
  encryption: {
    enabled: process.env.ENCRYPTION_ENABLED === "true",
    password: process.env.ENCRYPTION_PASSWORD || "",
  },
  
  brevo: {
    apiKey: process.env.BREVO_API_KEY || "",
    senderEmail: process.env.BREVO_SENDER_EMAIL || "",
    senderName: process.env.BREVO_SENDER_NAME || "",
    baseUrl: process.env.BREVO_BASE_URL || "",
    // Alphanumeric SMS sender name (11 characters at most). Must be registered with Brevo for Nigeria, or SMS fails.
    smsSender: process.env.BREVO_SMS_SENDER || "",
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
  
  upload: {
    maxFileSizeBytes: (Number(process.env.UPLOAD_MAX_FILE_SIZE_MB) || 10) * 1024 * 1024,
    maxFiles: 10,
    allowedExtensions: ["jpeg", "jpg", "png", "pdf", "svg"],
  },

  team: {
    // Where invitation links point (the merchant web app), e.g. https://merchant.example.com
    merchantAppUrl: (process.env.MERCHANT_APP_URL || "http://localhost:5173").replace(/\/+$/, ""),
    invitationExpiryDays: Number(process.env.INVITATION_EXPIRY_DAYS) || 7,
  },

  geocoding: {
    googleApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
    // Overridable so tests can point the geocoder at a local stub
    baseUrl: process.env.GEOCODING_BASE_URL || "https://maps.googleapis.com/maps/api/geocode/json",
  },

  nearbyPharmacies: {
    defaultRadiusKm: Number(process.env.NEARBY_DEFAULT_RADIUS_KM) || 10,
  },

  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || "",
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || "",
  },

  // Paga (payments are moving here from Paystack). Keys come from the Paga Business Portal.
  // PAGA_ENV must be "live" only on the production server; test and live use different keys and accounts.
  paga: {
    env: (process.env.PAGA_ENV === "live" ? "live" : "test") as "test" | "live",
    publicKey: process.env.PAGA_PUBLIC_KEY || "",
    secretKey: process.env.PAGA_SECRET_KEY || "",
    hashKey: process.env.PAGA_HASH_KEY || "",
    // Paga's docs call the public key the "principal" and the secret key the "credentials", so the same pair is
    // used unless separate values are set. UNCONFIRMED for the sandbox until a real Business API call succeeds.
    businessPrincipal: process.env.PAGA_BUSINESS_PRINCIPAL || process.env.PAGA_PUBLIC_KEY || "",
    businessCredentials: process.env.PAGA_BUSINESS_CREDENTIALS || process.env.PAGA_SECRET_KEY || "",
    // Optional override of the Business API base URL (used by local tests against a fake Paga)
    businessUrl: process.env.PAGA_BUSINESS_URL || "",
    // Optional overrides of the Checkout hosts (local tests against a fake)
    checkoutUrl: process.env.PAGA_CHECKOUT_URL || "",
    checkoutVerifyUrl: process.env.PAGA_CHECKOUT_VERIFY_URL || "",
    timeoutMs: Number(process.env.PAGA_TIMEOUT_MS) || 20000,
    // validateDepositToBank requires an amount; Paga does not say which to use for name lookups.
    nameLookupAmountKobo: Math.round((Number(process.env.PAGA_NAME_LOOKUP_AMOUNT_NAIRA) || 100) * 100),
    bankListCacheMs: (Number(process.env.PAGA_BANK_LIST_CACHE_HOURS) || 6) * 60 * 60 * 1000,
  },

  // Payments: where Paga should call us back, and how the background sweeper behaves
  payments: {
    // Public address of THIS backend (Paga posts webhooks here). Must be reachable from the internet.
    publicBaseUrl: (process.env.PUBLIC_BASE_URL || process.env.BASE_API_URL || "http://localhost:3000").replace(/\/+$/, ""),
    // "paga" (default) or "paystack" (emergency fallback for NEW wallet fundings)
    walletFundingProvider: (process.env.PAYMENT_PROVIDER_WALLET_FUNDING || process.env.PAYMENT_PROVIDER || "paga").toLowerCase(),
    // A payment still pending after this long is marked expired (a late success is still credited)
    pendingExpiryHours: Number(process.env.PAYMENT_PENDING_EXPIRY_HOURS) || 24,
    // How long after expiry a late success can still be credited
    lateSuccessWindowDays: Number(process.env.PAYMENT_LATE_SUCCESS_DAYS) || 7,
    sweeperEnabled: process.env.PAYMENT_SWEEPER_ENABLED !== "false",
    sweeperIntervalMs: (Number(process.env.PAYMENT_SWEEPER_INTERVAL_SECONDS) || 300) * 1000,
    // Only payments older than this are checked (gives the webhook time to arrive first)
    sweeperMinAgeMs: (Number(process.env.PAYMENT_SWEEPER_MIN_AGE_SECONDS) || 120) * 1000,
  },

  // Withdrawals (payouts from a merchant's wallet to their bank account)
  withdrawals: {
    // "paga" (default) or "paystack" (emergency fallback)
    provider: (process.env.PAYMENT_PROVIDER_WITHDRAWALS || process.env.PAYMENT_PROVIDER || "paga").toLowerCase(),
    minNaira: Number(process.env.WITHDRAWAL_MIN_NAIRA) || 1000,
    // Where operational alerts go (Paga balance too low, payout stuck or reversed). Empty = logs only.
    opsAlertEmail: process.env.OPS_ALERT_EMAIL || "",
    // Alert when the Paga business balance drops below this (naira). 0 = off.
    lowBalanceAlertNaira: Number(process.env.PAGA_LOW_BALANCE_ALERT_NAIRA) || 0,
    // A payout still unresolved after this long raises an alert
    stuckAlertHours: Number(process.env.WITHDRAWAL_STUCK_ALERT_HOURS) || 6,
  },

  // Which provider answers bank-list and account-name checks: "paga" (default) or "paystack" (emergency fallback)
  bankVerification: {
    provider: (process.env.PAYMENT_PROVIDER_BANK_VERIFICATION || process.env.PAYMENT_PROVIDER || "paga").toLowerCase(),
    // verification attempts allowed per merchant per window (lookups may be billed by the provider)
    maxAttemptsPerWindow: Number(process.env.BANK_VERIFY_MAX_ATTEMPTS) || 10,
    windowMs: (Number(process.env.BANK_VERIFY_WINDOW_MINUTES) || 10) * 60 * 1000,
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
    privateKey: process.env.FIREBASE_PRIVATE_KEY || "",
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "",
  },
  
  otpExpiration: parseInt(process.env.OTP_EXPIRATION || "10", 10), // minutes
  
  baseUrl: process.env.BASE_API_URL || "http://localhost:3000",
  
  supportEmail: process.env.SUPPORT_EMAIL || "support@meditechhealth.ng",
  supportPhone: process.env.SUPPORT_PHONE || "+2348051114444",
  supportAddress: process.env.SUPPORT_ADDRESS || "14 Haruna Ishola Street, Lagos. Nigeria",

  internalIntegration: {
    keyId: process.env.MERCHANT_INTERNAL_KEY_ID || "experience_1",
    secret: process.env.MERCHANT_INTERNAL_SECRET || "",
    allowedClockSkewSeconds: parseInt(process.env.MERCHANT_INTERNAL_CLOCK_SKEW_SEC || "300", 10),
  },
  
  experience1Integration: {
    baseUrl: process.env.EXPERIENCE1_INTERNAL_BASE_URL || "",
  },

  drugstoreAnalytics: {
    commissionRate: drugstoreCommissionRate,
  },
  
  isProduction: process.env.NODE_ENV === "production",
};
