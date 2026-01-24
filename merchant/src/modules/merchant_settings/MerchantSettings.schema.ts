import Joi from "joi";

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).optional(),
  lastName: Joi.string().trim().min(2).max(50).optional(),
  phoneNumber: Joi.string()
    .trim()
    .pattern(/^[0-9]{7,15}$/)
    .optional()
    .messages({
      "string.pattern.base": "Phone number must be between 7-15 digits",
    }),
  phoneCountryCode: Joi.string().trim().optional(),
});

export const updatePaymentSchema = Joi.object({
  bankCode: Joi.string().required().messages({
    "any.required": "Bank code is required",
  }),
  accountNumber: Joi.string()
    .required()
    .pattern(/^[0-9]{10}$/)
    .messages({
      "any.required": "Account number is required",
      "string.pattern.base": "Account number must be 10 digits",
    }),
  accountName: Joi.string().required().trim().messages({
    "any.required": "Account name is required",
  }),
});

export const updateStoreSchema = Joi.object({
  businessName: Joi.string().trim().min(2).max(100).optional(),
  businessUrl: Joi.string().trim().max(200).optional(),
  businessAddress: Joi.string().trim().max(255).optional(),
  city: Joi.string().trim().max(100).optional(),
  state: Joi.string().trim().max(100).optional(),
  landmark: Joi.string().trim().max(255).optional(),
  openHour: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional()
    .messages({
      "string.pattern.base": "Open hour must be in HH:MM format",
    }),
  closeHour: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional()
    .messages({
      "string.pattern.base": "Close hour must be in HH:MM format",
    }),
  vacation: Joi.boolean().optional(),
  vacationStartDate: Joi.string().isoDate().allow(null).optional(),
  vacationEndDate: Joi.string().isoDate().allow(null).optional(),
  storeDescription: Joi.string().trim().max(500).optional(),
  storeBannerUrl: Joi.string().uri().trim().optional(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "Current password is required",
  }),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .required()
    .messages({
      "any.required": "New password is required",
      "string.min": "Password must be at least 8 characters",
      "string.pattern.base":
        "Password must contain uppercase, lowercase, number, and special character",
    }),
  confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required().messages({
    "any.required": "Confirm password is required",
    "any.only": "Passwords must match",
  }),
});

export const updateNotificationsSchema = Joi.object({
  pushNotificationsEnabled: Joi.boolean().optional(),
  emailNotificationsEnabled: Joi.boolean().optional(),
  notificationPreferences: Joi.object({
    orderPlaced: Joi.object({
      email: Joi.boolean().optional(),
      sms: Joi.boolean().optional(),
      desktop: Joi.boolean().optional(),
    }).optional(),
    lowStock: Joi.object({
      email: Joi.boolean().optional(),
      sms: Joi.boolean().optional(),
      desktop: Joi.boolean().optional(),
    }).optional(),
    payoutAlert: Joi.object({
      email: Joi.boolean().optional(),
      sms: Joi.boolean().optional(),
      desktop: Joi.boolean().optional(),
    }).optional(),
    supportTicket: Joi.object({
      email: Joi.boolean().optional(),
      sms: Joi.boolean().optional(),
      desktop: Joi.boolean().optional(),
    }).optional(),
  }).optional(),
});

export const updatePreferencesSchema = Joi.object({
  storePreferences: Joi.object({
    acceptOrdersAutomatically: Joi.boolean().optional(),
    requireManualApprovalForPrescriptions: Joi.boolean().optional(),
    allowOutOfStockAlternatives: Joi.boolean().optional(),
    autoHideOutOfStock: Joi.boolean().optional(),
    enablePharmacyPickup: Joi.boolean().optional(),
    enableInHouseDelivery: Joi.boolean().optional(),
    deliveryRadius: Joi.number().min(0).allow(null).optional(),
    deliveryFeeType: Joi.string().valid("flat", "distance-based").optional(),
    deliveryFlatFee: Joi.number().min(0).allow(null).optional(),
    deliveryPricePerKm: Joi.number().min(0).allow(null).optional(),
    deliveryMinKm: Joi.number().min(0).allow(null).optional(),
    deliveryStartTime: Joi.string()
      .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .allow(null)
      .optional(),
    deliveryEndTime: Joi.string()
      .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .allow(null)
      .optional(),
    lowStockThreshold: Joi.number().integer().min(1).optional(),
    showLowStockLabel: Joi.boolean().optional(),
  }).optional(),
});

// Unified schema for updating all settings at once
export const updateAllSettingsSchema = Joi.object({
  // Profile fields
  firstName: Joi.string().trim().min(2).max(50).optional(),
  lastName: Joi.string().trim().min(2).max(50).optional(),
  phoneNumber: Joi.string()
    .trim()
    .pattern(/^[0-9]{7,15}$/)
    .optional()
    .messages({
      "string.pattern.base": "Phone number must be between 7-15 digits",
    }),
  phoneCountryCode: Joi.string().trim().optional(),
  
  // Store fields
  businessName: Joi.string().trim().min(2).max(100).optional(),
  businessUrl: Joi.string().trim().max(200).optional(),
  businessAddress: Joi.string().trim().max(255).optional(),
  city: Joi.string().trim().max(100).optional(),
  state: Joi.string().trim().max(100).optional(),
  landmark: Joi.string().trim().max(255).optional(),
  openHour: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional()
    .messages({
      "string.pattern.base": "Open hour must be in HH:MM format",
    }),
  closeHour: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional()
    .messages({
      "string.pattern.base": "Close hour must be in HH:MM format",
    }),
  vacation: Joi.boolean().optional(),
  vacationStartDate: Joi.string().isoDate().allow(null).optional(),
  vacationEndDate: Joi.string().isoDate().allow(null).optional(),
  storeDescription: Joi.string().trim().max(500).optional(),
  storeBannerUrl: Joi.string().uri().trim().optional(),
  
  // Payment fields (all optional in unified update)
  bankCode: Joi.string().optional(),
  accountNumber: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .optional()
    .messages({
      "string.pattern.base": "Account number must be 10 digits",
    }),
  accountName: Joi.string().trim().optional(),
  
  // Notifications
  pushNotificationsEnabled: Joi.boolean().optional(),
  emailNotificationsEnabled: Joi.boolean().optional(),
  notificationPreferences: Joi.object({
    orderPlaced: Joi.object({
      email: Joi.boolean().optional(),
      sms: Joi.boolean().optional(),
      desktop: Joi.boolean().optional(),
    }).optional(),
    lowStock: Joi.object({
      email: Joi.boolean().optional(),
      sms: Joi.boolean().optional(),
      desktop: Joi.boolean().optional(),
    }).optional(),
    payoutAlert: Joi.object({
      email: Joi.boolean().optional(),
      sms: Joi.boolean().optional(),
      desktop: Joi.boolean().optional(),
    }).optional(),
    supportTicket: Joi.object({
      email: Joi.boolean().optional(),
      sms: Joi.boolean().optional(),
      desktop: Joi.boolean().optional(),
    }).optional(),
  }).optional(),
  
  // Preferences
  storePreferences: Joi.object({
    acceptOrdersAutomatically: Joi.boolean().optional(),
    requireManualApprovalForPrescriptions: Joi.boolean().optional(),
    allowOutOfStockAlternatives: Joi.boolean().optional(),
    autoHideOutOfStock: Joi.boolean().optional(),
    enablePharmacyPickup: Joi.boolean().optional(),
    enableInHouseDelivery: Joi.boolean().optional(),
    deliveryRadius: Joi.number().min(0).allow(null).optional(),
    deliveryFeeType: Joi.string().valid("flat", "distance-based").optional(),
    deliveryFlatFee: Joi.number().min(0).allow(null).optional(),
    deliveryPricePerKm: Joi.number().min(0).allow(null).optional(),
    deliveryMinKm: Joi.number().min(0).allow(null).optional(),
    deliveryStartTime: Joi.string()
      .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .allow(null)
      .optional(),
    deliveryEndTime: Joi.string()
      .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .allow(null)
      .optional(),
    lowStockThreshold: Joi.number().integer().min(1).optional(),
    showLowStockLabel: Joi.boolean().optional(),
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
