import Joi from "joi";

export const categoryGroupSlugParamSchema = Joi.object({
	slug: Joi.string().trim().required(),
});
