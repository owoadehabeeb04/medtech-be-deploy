import Joi from "joi";

const inStoreOrderItemSchema = Joi.object({
  productId: Joi.string().uuid().required(),
  quantity: Joi.number().integer().min(1).required(),
});

export const createInStoreSaleSchema = Joi.object({
  // `productId` and `quantity` keep the first version of the Figma flow simple.
  // `items` allows the same modal to grow into a multi-item order without a
  // schema/table change.
  productId: Joi.string().uuid().optional(),
  quantity: Joi.number().integer().min(1).optional(),
  items: Joi.array().items(inStoreOrderItemSchema).min(1).max(50).optional(),
  customerName: Joi.string().trim().max(255).allow("", null).optional(),
  customerPhone: Joi.string().trim().max(50).allow("", null).optional(),
  paymentStatus: Joi.string().valid("pending", "paid", "failed").default("paid"),
  deliveryStatus: Joi.string()
    .valid("pending", "picked_up", "in_transit", "delivered", "completed", "cancelled")
    .default("delivered"),
  note: Joi.string().trim().max(2000).allow("", null).optional(),
  idempotencyKey: Joi.string().trim().max(255).allow("", null).optional(),
}).or("items", "productId");

const idempotencyKeySchema = Joi.string().trim().max(255).required().messages({
  "any.required": "Idempotency-Key is required so this action cannot be applied twice",
  "string.empty": "Idempotency-Key cannot be empty",
  "string.max": "Idempotency-Key cannot exceed 255 characters",
});

export const cancelInStoreSaleSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required().messages({
    "any.required": "A cancellation reason is required",
    "string.empty": "Cancellation reason cannot be empty",
    "string.min": "Cancellation reason must be at least 3 characters",
  }),
  idempotencyKey: idempotencyKeySchema,
});

export const returnInStoreSaleSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        orderItemId: Joi.string().uuid().required().messages({
          "any.required": "Each returned item must include orderItemId",
          "string.guid": "Each returned item must include a valid orderItemId",
        }),
        quantity: Joi.number().integer().min(1).required().messages({
          "any.required": "Each returned item must include a positive quantity",
          "number.min": "Returned quantity must be at least 1",
        }),
        condition: Joi.string().valid("resalable", "damaged").required().messages({
          "any.only": "Returned item condition must be resalable or damaged",
          "any.required": "Each returned item must include its condition",
        }),
      })
    )
    .min(1)
    .max(50)
    .required()
    .messages({
      "any.required": "At least one returned item is required",
      "array.min": "At least one returned item is required",
    }),
  reason: Joi.string().trim().min(3).max(500).required().messages({
    "any.required": "A return reason is required",
    "string.empty": "Return reason cannot be empty",
    "string.min": "Return reason must be at least 3 characters",
  }),
  idempotencyKey: idempotencyKeySchema,
});

export const refundInStoreSaleSchema = Joi.object({
  amount: Joi.number().positive().precision(2).optional().messages({
    "number.positive": "Refund amount must be greater than zero",
    "number.precision": "Refund amount can have at most two decimal places",
  }),
  method: Joi.string().valid("cash", "pos", "bank_transfer", "other").required().messages({
    "any.only": "Refund method must be cash, pos, bank_transfer, or other",
    "any.required": "A refund method is required",
  }),
  reference: Joi.string().trim().max(255).allow("", null).optional(),
  note: Joi.string().trim().max(500).allow("", null).optional(),
  idempotencyKey: idempotencyKeySchema,
});
