import Joi from "joi";

export const getCatalogProductsQuerySchema = Joi.object({
	page: Joi.number().integer().min(1).default(1),
	limit: Joi.number().integer().min(1).max(100).default(20),
	search: Joi.string().trim().allow(""),
	category: Joi.string().trim(),
	merchantId: Joi.string().uuid().optional().description("Omit to browse/search across every pharmacy instead of one."),
	brand: Joi.alternatives().try(Joi.array().items(Joi.string().trim()), Joi.string().trim()),
	priceMin: Joi.number().min(0),
	priceMax: Joi.number().min(0),
	sortBy: Joi.string().valid("createdAt", "price", "name").default("createdAt"),
	sortDirection: Joi.string().valid("asc", "desc").default("desc"),
});

export const catalogBrandsQuerySchema = Joi.object({
	category: Joi.string().trim().optional(),
	merchantId: Joi.string().uuid().optional(),
});

export const topSellingProductsQuerySchema = Joi.object({
	limit: Joi.number().integer().min(1).max(50).default(20),
});

export const nearbyPharmaciesQuerySchema = Joi.object({
	addressId: Joi.string().uuid().optional(),
	latitude: Joi.number().min(-90).max(90).optional(),
	longitude: Joi.number().min(-180).max(180).optional(),
	search: Joi.string().trim().allow(""),
	page: Joi.number().integer().min(1).default(1),
	limit: Joi.number().integer().min(1).max(100).default(20),
});

export const validateCatalogDiscountSchema = Joi.object({
	merchantId: Joi.string().uuid().required(),
	code: Joi.string().trim().uppercase().required(),
	orderAmount: Joi.number().min(0).required(),
	productIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
});

export const addCartItemSchema = Joi.object({
	merchantId: Joi.string().uuid().required(),
	merchantProductId: Joi.string().uuid().required(),
	quantity: Joi.number().integer().min(1).required(),
});

export const upsertDrugstoreAddressSchema = Joi.object({
	label: Joi.string().trim().max(80).optional(),
	addressLine1: Joi.string().trim().min(3).max(200).required(),
	addressLine2: Joi.string().trim().max(200).allow(""),
	city: Joi.string().trim().min(2).max(80).required(),
	state: Joi.string().trim().min(2).max(80).required(),
	recipientName: Joi.string().trim().min(2).max(120).required(),
	recipientPhone: Joi.string().trim().min(7).max(20).required(),
	isDefault: Joi.boolean().optional(),
	latitude: Joi.number().min(-90).max(90).allow(null).optional(),
	longitude: Joi.number().min(-180).max(180).allow(null).optional(),
});

export const updateCartItemSchema = Joi.object({
	quantity: Joi.number().integer().min(1).required(),
});

export const createOrderSchema = Joi.object({
	paymentMethod: Joi.string().valid("card", "bank_transfer", "wallet", "pay_in_store").required(),
	fulfillmentMethod: Joi.string().valid("delivery", "pickup").default("delivery"),
	merchantId: Joi.string().uuid().optional().description("Which pharmacy's active cart to check out. Required if the caller has active carts at more than one pharmacy simultaneously."),
	couponCode: Joi.string().trim().uppercase().optional(),
	addressId: Joi.string().uuid().optional().description("Ignored for pickup orders — pickup has no delivery destination."),
	deliveryNote: Joi.string().trim().max(500).allow(""),
	deliveryDate: Joi.string().isoDate().optional(),
	deliveryTimeSlot: Joi.string().trim().max(60).optional(),
	returnUrl: Joi.string().uri({ scheme: ["http", "https"] }).optional(),
	savedCardId: Joi.string().uuid().optional().description("Pay with a previously saved card instead of a new redirect-based card payment. Only used when paymentMethod is card."),
	saveCard: Joi.boolean().optional().description("Save the card used for this payment for future reuse. Only relevant when paymentMethod is card and savedCardId is not supplied."),
}).custom((value, helpers) => {
	if (value.paymentMethod === "pay_in_store" && value.fulfillmentMethod !== "pickup") {
		return helpers.message({ custom: "pay_in_store is only valid when fulfillmentMethod is pickup" });
	}
	return value;
}, "pay_in_store requires pickup");

export const confirmOrderPaymentSchema = Joi.object({
	paymentReference: Joi.string().trim().min(4).max(120).required(),
	providerStatus: Joi.string().valid("paid", "failed").optional(),
});

export const cancelOrderSchema = Joi.object({
	reason: Joi.string().trim().max(500).allow(""),
});

export const listOrdersQuerySchema = Joi.object({
	page: Joi.number().integer().min(1).default(1),
	limit: Joi.number().integer().min(1).max(100).default(20),
	paymentStatus: Joi.alternatives().try(
		Joi.array().items(Joi.string().valid("pending", "paid", "failed")),
		Joi.string().valid("pending", "paid", "failed")
	),
	deliveryStatus: Joi.alternatives().try(
		Joi.array().items(Joi.string().valid("pending", "picked_up", "in_transit", "delivered", "cancelled")),
		Joi.string().valid("pending", "picked_up", "in_transit", "delivered", "cancelled")
	),
	dateRange: Joi.string().valid("today", "yesterday", "last_7_days", "last_30_days"),
	ageBucket: Joi.string().valid("lt_24h", "between_24h_48h", "gt_48h"),
});

export const productIdParamSchema = Joi.object({
	productId: Joi.string().uuid().required(),
});

export const productAvailabilityQuerySchema = Joi.object({
	merchantId: Joi.string().uuid().required(),
	quantity: Joi.number().integer().min(1).default(1),
});

export const itemIdParamSchema = Joi.object({
	itemId: Joi.string().uuid().required(),
});

export const merchantIdParamSchema = Joi.object({
	merchantId: Joi.string().uuid().required(),
});

export const orderIdParamSchema = Joi.object({
	orderId: Joi.string().uuid().required(),
});

export const addressIdParamSchema = Joi.object({
	addressId: Joi.string().uuid().required(),
});

export const prescriptionIdParamSchema = Joi.object({
	prescriptionId: Joi.string().uuid().required(),
});

export const submitPrescriptionSchema = Joi.object({
	merchantId: Joi.string().uuid().required(),
	cartId: Joi.string().uuid().optional(),
	patientName: Joi.string().trim().min(2).max(120).required(),
	prescriptionDate: Joi.string().isoDate().required(),
	isForSelf: Joi.boolean().default(true),
});

export const reviewPrescriptionSchema = Joi.object({
	action: Joi.string().valid("approved", "rejected", "needs_clarification").required(),
	note: Joi.string().trim().max(500).allow(""),
	reviewerName: Joi.string().trim().max(120).allow(""),
	reviewerId: Joi.string().trim().max(120).allow(""),
});
