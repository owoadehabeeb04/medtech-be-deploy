import Joi from "joi";

export const registerMerchantDeviceTokenSchema = Joi.object({
  deviceId: Joi.string().trim().min(1).max(255).required().messages({
    "any.required": "deviceId is required",
    "string.empty": "deviceId is required",
  }),
  token: Joi.string().trim().min(1).max(4096).required().messages({
    "any.required": "FCM token is required",
    "string.empty": "FCM token is required",
  }),
  platform: Joi.string().valid("web").default("web"),
  browser: Joi.string().trim().max(100).allow(null, "").optional(),
  userAgent: Joi.string().trim().max(1000).allow(null, "").optional(),
}).required();
