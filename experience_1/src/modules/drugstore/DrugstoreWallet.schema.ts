import Joi from "joi";

export const fundWalletSchema = Joi.object({
	amountNgn: Joi.number().positive().required(),
});

export const confirmWalletFundingSchema = Joi.object({
	paymentReference: Joi.string().trim().min(4).max(120).required(),
});

export const walletTransactionsQuerySchema = Joi.object({
	page: Joi.number().integer().min(1).default(1),
	limit: Joi.number().integer().min(1).max(100).default(20),
});
