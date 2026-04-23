import Joi from "joi";

export const CreateDoctorHealthPackageSchema = Joi.object({
	title: Joi.string().trim().min(1).max(150).required(),
	priceNgn: Joi.number().positive().required(),
	description: Joi.string().trim().min(1).max(5000).required(),
});

export const UpdateDoctorHealthPackageSchema = Joi.object({
	title: Joi.string().trim().min(1).max(150).optional(),
	priceNgn: Joi.number().positive().optional(),
	description: Joi.string().trim().min(1).max(5000).optional(),
});

export const DoctorHealthPackageParamsSchema = Joi.object({
	packageId: Joi.number().integer().positive().required(),
});
