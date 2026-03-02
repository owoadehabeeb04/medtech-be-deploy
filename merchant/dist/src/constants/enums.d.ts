/**
 * Enums and constants for the application
 */
export declare enum ProductStatus {
    IN_STOCK = "in_stock",
    LOW_STOCK = "low_stock",
    OUT_OF_STOCK = "out_of_stock"
}
export declare enum ProductCategory {
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
    OTHER = "Other"
}
export declare enum DiscountType {
    FIXED_AMOUNT = "fixed_amount",
    PERCENTAGE = "percentage"
}
export declare enum DiscountStatus {
    ACTIVE = "active",
    INACTIVE = "inactive"
}
export declare const getEnumValues: <T extends Record<string, string>>(enumObj: T) => string[];
export declare const PRODUCT_STATUSES: string[];
export declare const PRODUCT_CATEGORIES: string[];
export declare const DISCOUNT_TYPES: string[];
export declare const DISCOUNT_STATUSES: string[];
//# sourceMappingURL=enums.d.ts.map