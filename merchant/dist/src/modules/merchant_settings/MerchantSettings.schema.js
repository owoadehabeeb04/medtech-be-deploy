"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAllSettingsSchema = exports.updatePreferencesSchema = exports.updateNotificationsSchema = exports.changePasswordSchema = exports.updateStoreSchema = exports.updatePaymentSchema = exports.updateProfileSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.updateProfileSchema = joi_1.default.object({
    firstName: joi_1.default.string().trim().min(2).max(50).optional(),
    lastName: joi_1.default.string().trim().min(2).max(50).optional(),
    phoneNumber: joi_1.default.string()
        .trim()
        .pattern(/^[0-9]{7,15}$/)
        .optional()
        .messages({
        "string.pattern.base": "Phone number must be between 7-15 digits",
    }),
    phoneCountryCode: joi_1.default.string().trim().optional(),
});
exports.updatePaymentSchema = joi_1.default.object({
    bankCode: joi_1.default.string().required().messages({
        "any.required": "Bank code is required",
    }),
    accountNumber: joi_1.default.string()
        .required()
        .pattern(/^[0-9]{10}$/)
        .messages({
        "any.required": "Account number is required",
        "string.pattern.base": "Account number must be 10 digits",
    }),
    accountName: joi_1.default.string().required().trim().messages({
        "any.required": "Account name is required",
    }),
});
exports.updateStoreSchema = joi_1.default.object({
    businessName: joi_1.default.string().trim().min(2).max(100).optional(),
    businessUrl: joi_1.default.string().trim().max(200).optional(),
    businessAddress: joi_1.default.string().trim().max(255).optional(),
    city: joi_1.default.string().trim().max(100).optional(),
    state: joi_1.default.string().trim().max(100).optional(),
    landmark: joi_1.default.string().trim().max(255).optional(),
    openHour: joi_1.default.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .optional()
        .messages({
        "string.pattern.base": "Open hour must be in HH:MM format",
    }),
    closeHour: joi_1.default.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .optional()
        .messages({
        "string.pattern.base": "Close hour must be in HH:MM format",
    }),
    vacation: joi_1.default.boolean().optional(),
    vacationStartDate: joi_1.default.string().isoDate().allow(null).optional(),
    vacationEndDate: joi_1.default.string().isoDate().allow(null).optional(),
    storeDescription: joi_1.default.string().trim().max(500).optional(),
    storeBannerUrl: joi_1.default.string().uri().trim().optional(),
});
exports.changePasswordSchema = joi_1.default.object({
    currentPassword: joi_1.default.string().required().messages({
        "any.required": "Current password is required",
    }),
    newPassword: joi_1.default.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
        .required()
        .messages({
        "any.required": "New password is required",
        "string.min": "Password must be at least 8 characters",
        "string.pattern.base": "Password must contain uppercase, lowercase, number, and special character",
    }),
    confirmPassword: joi_1.default.string().valid(joi_1.default.ref("newPassword")).required().messages({
        "any.required": "Confirm password is required",
        "any.only": "Passwords must match",
    }),
});
exports.updateNotificationsSchema = joi_1.default.object({
    pushNotificationsEnabled: joi_1.default.boolean().optional(),
    emailNotificationsEnabled: joi_1.default.boolean().optional(),
    notificationPreferences: joi_1.default.object({
        orderPlaced: joi_1.default.object({
            email: joi_1.default.boolean().optional(),
            sms: joi_1.default.boolean().optional(),
            desktop: joi_1.default.boolean().optional(),
        }).optional(),
        lowStock: joi_1.default.object({
            email: joi_1.default.boolean().optional(),
            sms: joi_1.default.boolean().optional(),
            desktop: joi_1.default.boolean().optional(),
        }).optional(),
        payoutAlert: joi_1.default.object({
            email: joi_1.default.boolean().optional(),
            sms: joi_1.default.boolean().optional(),
            desktop: joi_1.default.boolean().optional(),
        }).optional(),
        supportTicket: joi_1.default.object({
            email: joi_1.default.boolean().optional(),
            sms: joi_1.default.boolean().optional(),
            desktop: joi_1.default.boolean().optional(),
        }).optional(),
    }).optional(),
});
exports.updatePreferencesSchema = joi_1.default.object({
    storePreferences: joi_1.default.object({
        acceptOrdersAutomatically: joi_1.default.boolean().optional(),
        requireManualApprovalForPrescriptions: joi_1.default.boolean().optional(),
        allowOutOfStockAlternatives: joi_1.default.boolean().optional(),
        autoHideOutOfStock: joi_1.default.boolean().optional(),
        enablePharmacyPickup: joi_1.default.boolean().optional(),
        enableInHouseDelivery: joi_1.default.boolean().optional(),
        deliveryRadius: joi_1.default.number().min(0).allow(null).optional(),
        deliveryFeeType: joi_1.default.string().valid("flat", "distance-based").optional(),
        deliveryFlatFee: joi_1.default.number().min(0).allow(null).optional(),
        deliveryPricePerKm: joi_1.default.number().min(0).allow(null).optional(),
        deliveryMinKm: joi_1.default.number().min(0).allow(null).optional(),
        deliveryStartTime: joi_1.default.string()
            .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .allow(null)
            .optional(),
        deliveryEndTime: joi_1.default.string()
            .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .allow(null)
            .optional(),
        lowStockThreshold: joi_1.default.number().integer().min(1).optional(),
        showLowStockLabel: joi_1.default.boolean().optional(),
    }).optional(),
});
// Unified schema for updating all settings at once
exports.updateAllSettingsSchema = joi_1.default.object({
    // Profile fields
    firstName: joi_1.default.string().trim().min(2).max(50).optional(),
    lastName: joi_1.default.string().trim().min(2).max(50).optional(),
    phoneNumber: joi_1.default.string()
        .trim()
        .pattern(/^[0-9]{7,15}$/)
        .optional()
        .messages({
        "string.pattern.base": "Phone number must be between 7-15 digits",
    }),
    phoneCountryCode: joi_1.default.string().trim().optional(),
    // Store fields
    businessName: joi_1.default.string().trim().min(2).max(100).optional(),
    businessUrl: joi_1.default.string().trim().max(200).optional(),
    businessAddress: joi_1.default.string().trim().max(255).optional(),
    city: joi_1.default.string().trim().max(100).optional(),
    state: joi_1.default.string().trim().max(100).optional(),
    landmark: joi_1.default.string().trim().max(255).optional(),
    openHour: joi_1.default.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .optional()
        .messages({
        "string.pattern.base": "Open hour must be in HH:MM format",
    }),
    closeHour: joi_1.default.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .optional()
        .messages({
        "string.pattern.base": "Close hour must be in HH:MM format",
    }),
    vacation: joi_1.default.boolean().optional(),
    vacationStartDate: joi_1.default.string().isoDate().allow(null).optional(),
    vacationEndDate: joi_1.default.string().isoDate().allow(null).optional(),
    storeDescription: joi_1.default.string().trim().max(500).optional(),
    storeBannerUrl: joi_1.default.string().uri().trim().optional(),
    // Payment fields (all optional in unified update)
    bankCode: joi_1.default.string().optional(),
    accountNumber: joi_1.default.string()
        .pattern(/^[0-9]{10}$/)
        .optional()
        .messages({
        "string.pattern.base": "Account number must be 10 digits",
    }),
    accountName: joi_1.default.string().trim().optional(),
    // Notifications
    pushNotificationsEnabled: joi_1.default.boolean().optional(),
    emailNotificationsEnabled: joi_1.default.boolean().optional(),
    notificationPreferences: joi_1.default.object({
        orderPlaced: joi_1.default.object({
            email: joi_1.default.boolean().optional(),
            sms: joi_1.default.boolean().optional(),
            desktop: joi_1.default.boolean().optional(),
        }).optional(),
        lowStock: joi_1.default.object({
            email: joi_1.default.boolean().optional(),
            sms: joi_1.default.boolean().optional(),
            desktop: joi_1.default.boolean().optional(),
        }).optional(),
        payoutAlert: joi_1.default.object({
            email: joi_1.default.boolean().optional(),
            sms: joi_1.default.boolean().optional(),
            desktop: joi_1.default.boolean().optional(),
        }).optional(),
        supportTicket: joi_1.default.object({
            email: joi_1.default.boolean().optional(),
            sms: joi_1.default.boolean().optional(),
            desktop: joi_1.default.boolean().optional(),
        }).optional(),
    }).optional(),
    // Preferences
    storePreferences: joi_1.default.object({
        acceptOrdersAutomatically: joi_1.default.boolean().optional(),
        requireManualApprovalForPrescriptions: joi_1.default.boolean().optional(),
        allowOutOfStockAlternatives: joi_1.default.boolean().optional(),
        autoHideOutOfStock: joi_1.default.boolean().optional(),
        enablePharmacyPickup: joi_1.default.boolean().optional(),
        enableInHouseDelivery: joi_1.default.boolean().optional(),
        deliveryRadius: joi_1.default.number().min(0).allow(null).optional(),
        deliveryFeeType: joi_1.default.string().valid("flat", "distance-based").optional(),
        deliveryFlatFee: joi_1.default.number().min(0).allow(null).optional(),
        deliveryPricePerKm: joi_1.default.number().min(0).allow(null).optional(),
        deliveryMinKm: joi_1.default.number().min(0).allow(null).optional(),
        deliveryStartTime: joi_1.default.string()
            .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .allow(null)
            .optional(),
        deliveryEndTime: joi_1.default.string()
            .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .allow(null)
            .optional(),
        lowStockThreshold: joi_1.default.number().integer().min(1).optional(),
        showLowStockLabel: joi_1.default.boolean().optional(),
    }).optional(),
})
    .custom((value, helpers) => {
    // If payment fields are provided, all three must be present
    const hasPaymentFields = value.bankCode || value.accountNumber || value.accountName;
    if (hasPaymentFields) {
        if (!value.bankCode || !value.accountNumber || !value.accountName) {
            return helpers.error("If updating payment details, bankCode, accountNumber, and accountName are all required");
        }
    }
    return value;
});
