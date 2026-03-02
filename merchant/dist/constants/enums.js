"use strict";
/**
 * Enums and constants for the application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DISCOUNT_STATUSES = exports.DISCOUNT_TYPES = exports.PRODUCT_CATEGORIES = exports.PRODUCT_STATUSES = exports.getEnumValues = exports.DiscountStatus = exports.DiscountType = exports.ProductCategory = exports.ProductStatus = void 0;
// Product Status
var ProductStatus;
(function (ProductStatus) {
    ProductStatus["IN_STOCK"] = "in_stock";
    ProductStatus["LOW_STOCK"] = "low_stock";
    ProductStatus["OUT_OF_STOCK"] = "out_of_stock";
})(ProductStatus || (exports.ProductStatus = ProductStatus = {}));
// Product Categories
var ProductCategory;
(function (ProductCategory) {
    ProductCategory["ANTIBIOTICS"] = "Antibiotics";
    ProductCategory["VITAMINS_NUTRITION"] = "Vitamins & Nutrition";
    ProductCategory["MEDICAL_EQUIPMENT"] = "Medical Equipment";
    ProductCategory["WOMEN_CARE"] = "Women Care";
    ProductCategory["PAIN_RELIEF"] = "Pain Relief";
    ProductCategory["FIRST_AID"] = "First Aid";
    ProductCategory["BABY_CARE"] = "Baby Care";
    ProductCategory["SKIN_CARE"] = "Skin Care";
    ProductCategory["DENTAL_CARE"] = "Dental Care";
    ProductCategory["EYE_CARE"] = "Eye Care";
    ProductCategory["OTHER"] = "Other";
})(ProductCategory || (exports.ProductCategory = ProductCategory = {}));
// Discount Types
var DiscountType;
(function (DiscountType) {
    DiscountType["FIXED_AMOUNT"] = "fixed_amount";
    DiscountType["PERCENTAGE"] = "percentage";
})(DiscountType || (exports.DiscountType = DiscountType = {}));
// Discount Status
var DiscountStatus;
(function (DiscountStatus) {
    DiscountStatus["ACTIVE"] = "active";
    DiscountStatus["INACTIVE"] = "inactive";
})(DiscountStatus || (exports.DiscountStatus = DiscountStatus = {}));
// Helper to get enum values as array
const getEnumValues = (enumObj) => {
    return Object.values(enumObj);
};
exports.getEnumValues = getEnumValues;
// Export arrays for validation
exports.PRODUCT_STATUSES = (0, exports.getEnumValues)(ProductStatus);
exports.PRODUCT_CATEGORIES = (0, exports.getEnumValues)(ProductCategory);
exports.DISCOUNT_TYPES = (0, exports.getEnumValues)(DiscountType);
exports.DISCOUNT_STATUSES = (0, exports.getEnumValues)(DiscountStatus);
