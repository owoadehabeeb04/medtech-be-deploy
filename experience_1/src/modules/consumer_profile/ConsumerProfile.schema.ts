import Joi from "joi";

export const ConsumerProfileSchema = Joi.object({
	username: Joi.string().min(3).max(50).optional(),
	phoneNumber: Joi.string().min(7).max(20).optional(),
	dateOfBirth: Joi.date().optional(),
	houseNumber: Joi.string().min(1).max(50).optional(),
	streetName: Joi.string().min(2).max(120).optional(),
	localGovernmentArea: Joi.string().min(2).max(120).optional(),
	state: Joi.string().min(2).max(120).optional(),
	profileImage: Joi.string().uri().optional(),
}).min(1);
