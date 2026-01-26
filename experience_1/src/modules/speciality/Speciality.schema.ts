import Joi from "joi";

export const CreateSpecialitySchema = Joi.object({
	name: Joi.string().required(),
	key: Joi.string().required(),
	isActive: Joi.boolean(),
});

export const UpdateSpecialitySchema = Joi.object({
	id: Joi.number().required(),
	name: Joi.string(),
	key: Joi.string(),
	isActive: Joi.boolean(),
});

export const CommonSpecialitySchema = Joi.object({
	id: Joi.number().required(),
});

export const BulkCreateSpecialities = Joi.object({
	specialities: Joi.array().items(CreateSpecialitySchema).required(),
});


