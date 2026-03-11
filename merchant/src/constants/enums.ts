/**
 * Enums and constants for the application
 */

// Product Status
export enum ProductStatus {
  IN_STOCK = "in_stock",
  LOW_STOCK = "low_stock",
  OUT_OF_STOCK = "out_of_stock",
}

// Product Categories
export enum ProductCategory {
  ANTIBIOTICS = "Antibiotics",
  VITAMINS_NUTRITION = "Vitamins & Nutrition",
  MEDICAL_EQUIPMENT = "Medical Equipment",
  WOMEN_CARE = "Women Care",
  PAIN_RELIEF = "Pain Relief",
  FIRST_AID = "First Aid",
  BABY_CARE = "Baby Care",
  SKIN_CARE = "Skin Care",
  DENTAL_CARE = "Dental Care",
  EYE_CARE = "Eye Care",
  OTHER = "Other",
}

// Discount Types
export enum DiscountType {
  FIXED_AMOUNT = "fixed_amount",
  PERCENTAGE = "percentage",
}

// Discount Status
export enum DiscountStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

// Helper to get enum values as array
export const getEnumValues = <T extends Record<string, string>>(enumObj: T): string[] => {
  return Object.values(enumObj);
};

// Subscription Plan Tiers
export enum PlanTier {
  FREE = "free",
  BRONZE = "bronze",
  SILVER = "silver",
  GOLD = "gold",
}

// Subscription Status
export enum SubscriptionStatus {
  ACTIVE = "active",
  CANCELLED = "cancelled",
  PAST_DUE = "past_due",
  EXPIRED = "expired",
}

// Transaction Types
export enum TransactionType {
  SUBSCRIPTION_PAYMENT = "subscription_payment",
  WALLET_FUNDING = "wallet_funding",
  WALLET_DEBIT = "wallet_debit",
  REFUND = "refund",
}

// Transaction Status
export enum TransactionStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
}

// Payment Methods
export enum PaymentMethod {
  WALLET = "wallet",
  CARD = "card",
  BANK_TRANSFER = "bank_transfer",
}

// Payout Frequency
export enum PayoutFrequency {
  NONE = "none",
  WEEKLY = "weekly",
  DAILY = "daily",
  SAME_DAY = "same_day",
}

// Support Tiers
export enum SupportTier {
  STANDARD = "standard",
  DEDICATED = "dedicated",
}

// Performance Summary Levels
export enum PerformanceSummaryLevel {
  NONE = "none",
  BASIC = "basic",
  MONTHLY = "monthly",
}

// Scheduled Plan Change Status
export enum ScheduledChangeStatus {
  PENDING = "pending",
  APPLIED = "applied",
  CANCELLED = "cancelled",
}

// Export arrays for validation
export const PRODUCT_STATUSES = getEnumValues(ProductStatus);
export const PRODUCT_CATEGORIES = getEnumValues(ProductCategory);
export const DISCOUNT_TYPES = getEnumValues(DiscountType);
export const DISCOUNT_STATUSES = getEnumValues(DiscountStatus);
export const PLAN_TIERS = getEnumValues(PlanTier);
export const SUBSCRIPTION_STATUSES = getEnumValues(SubscriptionStatus);
export const TRANSACTION_TYPES = getEnumValues(TransactionType);
export const TRANSACTION_STATUSES = getEnumValues(TransactionStatus);
export const PAYMENT_METHODS = getEnumValues(PaymentMethod);
export const PAYOUT_FREQUENCIES = getEnumValues(PayoutFrequency);
export const SUPPORT_TIERS = getEnumValues(SupportTier);
export const PERFORMANCE_SUMMARY_LEVELS = getEnumValues(PerformanceSummaryLevel);
export const SCHEDULED_CHANGE_STATUSES = getEnumValues(ScheduledChangeStatus);
