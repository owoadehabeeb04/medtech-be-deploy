import Joi from "joi";

export const timeSlotsQuerySchema = Joi.object({
	fulfillmentMethod: Joi.string().valid("delivery", "pickup").default("delivery"),
});
