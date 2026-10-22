import Joi from "joi";

export const fundWalletSchema = Joi.object({
  amount: Joi.number()
    .integer()
    .min(100)
    .required()
    .messages({
      "number.base": "Amount must be a number",
      "number.integer": "Amount must be a whole number (in Naira)",
      "number.min": "Minimum funding amount is ₦100",
      "any.required": "Amount is required. Enter how much you'd like to add to your wallet.",
    }),
  // Where to send the merchant after paying (must be on an allowed origin; defaults to the merchant app's /callback page)
  returnUrl: Joi.string().uri().optional(),
});

export const withdrawWalletSchema = Joi.object({
  amount: Joi.number()
    .integer()
    .min(100)
    .required()
    .messages({
      "number.base": "Amount must be a number",
      "number.integer": "Withdrawal amount must be a whole number (in Naira)",
      "number.min": "Minimum withdrawal amount is ₦100",
      "any.required": "Amount is required. Enter how much you'd like to withdraw.",
    }),
  reason: Joi.string()
    .trim()
    .max(150)
    .allow("")
    .optional()
    .messages({
      "string.max": "Withdrawal narration cannot exceed 150 characters",
    }),
  // The total (amount + fee) the merchant was shown. If the fee has changed since, we ask them to confirm again.
  acceptedTotal: Joi.number().positive().optional(),
});

export const quoteWithdrawalSchema = Joi.object({
  amount: Joi.number().integer().min(1).required().messages({
    "number.base": "Amount must be a number",
    "number.integer": "Withdrawal amount must be a whole number (in Naira)",
    "any.required": "Amount is required. Enter how much you'd like to withdraw.",
  }),
});

export const confirmFundingSchema = Joi.object({
  reference: Joi.string().trim().required().messages({
    "any.required": "Payment reference is required to verify your wallet funding.",
    "string.empty": "Payment reference cannot be empty.",
  }),
});

export const paySubscriptionSchema = Joi.object({
  planId: Joi.string().uuid().required().messages({
    "string.guid": "Please provide a valid plan ID",
    "any.required": "Plan ID is required. Select the plan you want to pay for.",
  }),
});
