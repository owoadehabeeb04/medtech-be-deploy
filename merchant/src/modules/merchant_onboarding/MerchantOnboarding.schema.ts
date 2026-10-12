import Joi from "joi";

export const UploadValidIdSchema = Joi.object({
  validIdUrl: Joi.string().uri().required().messages({
    "string.uri": "Valid ID URL must be a valid URL",
    "string.empty": "Valid ID URL is required",
    "any.required": "Valid ID URL is required",
  }),
});

export const UploadProfilePictureSchema = Joi.object({
  profilePictureUrl: Joi.string().uri().required().messages({
    "string.uri": "Profile picture URL must be a valid URL",
    "string.empty": "Profile picture URL is required",
    "any.required": "Profile picture URL is required",
  }),
});

export const VerifyBankSchema = Joi.object({
  bankCode: Joi.string().required().messages({
    "string.empty": "Bank code is required",
    "any.required": "Bank code is required",
  }),
  accountNumber: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.pattern.base": "Account number must be exactly 10 digits",
      "string.empty": "Account number is required",
      "any.required": "Account number is required",
    }),
  accountName: Joi.string().min(3).max(100).required().messages({
    "string.min": "Account name must be at least 3 characters",
    "string.max": "Account name cannot exceed 100 characters",
    "string.empty": "Account name is required",
    "any.required": "Account name is required",
  }),
});

export const StoreAddressSchema = Joi.object({
  businessAddress: Joi.string().trim().min(5).max(255).required().messages({
    "string.empty": "Store address is required",
    "string.min": "Store address is too short",
    "any.required": "Store address is required",
  }),
  city: Joi.string().trim().max(100).required().messages({
    "string.empty": "City is required",
    "any.required": "City is required",
  }),
  state: Joi.string().trim().max(100).required().messages({
    "string.empty": "State is required",
    "any.required": "State is required",
  }),
  landmark: Joi.string().trim().max(255).allow("").optional(),
});
