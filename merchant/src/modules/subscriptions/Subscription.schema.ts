import Joi from "joi";
import { PAYMENT_METHODS } from "../../constants/enums";

export const subscribeSchema = Joi.object({
  planId: Joi.string().uuid().required().messages({
    "string.guid": "Please provide a valid plan ID",
    "any.required": "Plan ID is required. Select a subscription plan to continue.",
  }),
  paymentMethod: Joi.string()
    .valid(...PAYMENT_METHODS)
    .required()
    .messages({
      "any.only": "Invalid payment method. Choose from: wallet, card, or bank_transfer",
      "any.required": "Payment method is required. Select how you'd like to pay.",
    }),
});

export const upgradePlanSchema = Joi.object({
  planId: Joi.string().uuid().required().messages({
    "string.guid": "Please provide a valid plan ID",
    "any.required": "Plan ID is required. Select the plan you want to upgrade to.",
  }),
  paymentMethod: Joi.string()
    .valid(...PAYMENT_METHODS)
    .required()
    .messages({
      "any.only": "Invalid payment method. Choose from: wallet, card, or bank_transfer",
      "any.required": "Payment method is required. Select how you'd like to pay.",
    }),
});

export const downgradePlanSchema = Joi.object({
  planId: Joi.string().uuid().required().messages({
    "string.guid": "Please provide a valid plan ID",
    "any.required": "Plan ID is required. Select the plan you want to switch to.",
  }),
});

export const toggleAutoRenewSchema = Joi.object({
  autoRenew: Joi.boolean().required().messages({
    "any.required": "Please specify whether to enable or disable auto-renewal.",
  }),
});

export const confirmPaymentSchema = Joi.object({
  reference: Joi.string().trim().required().messages({
    "any.required": "Payment reference is required to verify your transaction.",
    "string.empty": "Payment reference cannot be empty.",
  }),
});
