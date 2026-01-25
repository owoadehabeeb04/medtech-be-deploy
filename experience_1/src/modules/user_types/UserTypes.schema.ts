import Joi from "joi";

export const CreateUserTypeSchema = Joi.object({
	name: Joi.string().required(),
	key: Joi.string().required(),
	permissionIds: Joi.array(),
});

export const CommonUserTypeSchema = Joi.object({
	userTypeId: Joi.number().required(),
});

export const UpdateUserTypeSchema = Joi.object({
	name: Joi.string().required(),
	key: Joi.string().required(),
	isActive: Joi.boolean(),
    userTypeId: Joi.number().required(),
});
