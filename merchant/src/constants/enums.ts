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

// Export arrays for validation
export const PRODUCT_STATUSES = getEnumValues(ProductStatus);
export const PRODUCT_CATEGORIES = getEnumValues(ProductCategory);
export const DISCOUNT_TYPES = getEnumValues(DiscountType);
export const DISCOUNT_STATUSES = getEnumValues(DiscountStatus);
