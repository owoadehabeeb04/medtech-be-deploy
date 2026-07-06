import Joi from "joi";

export const savedCardIdParamSchema = Joi.object({
	cardId: Joi.string().uuid().required(),
});
