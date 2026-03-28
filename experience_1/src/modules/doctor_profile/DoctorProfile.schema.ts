import Joi from "joi";

export const DoctorBasicProfileSchema = Joi.object({
	firstName: Joi.string().min(2).max(40).optional(),
	lastName: Joi.string().min(2).max(40).optional(),
	phoneNumber: Joi.string().min(7).max(20).optional(),
	medicalLicenseNumber: Joi.string().min(3).max(100).optional(),
	yearsOfExperience: Joi.number().min(0).optional(),
	bio: Joi.string().max(1000).optional(),
}).min(1);

export const DoctorImageSchema = Joi.object({});

export const DoctorAddressSchema = Joi.object({
	addressLine1: Joi.string().min(2).required(),
	addressLine2: Joi.string().allow("", null).optional(),
	city: Joi.string().min(2).required(),
	state: Joi.string().min(2).required(),
});

export const DoctorEducationSchema = Joi.object({
	institute: Joi.string().min(2).required(),
	certificate: Joi.string().min(2).required(),
	startDate: Joi.date().required(),
	endDate: Joi.date().min(Joi.ref("startDate")).optional().allow(null).messages({
		"date.min": "End date cannot be before start date",
	}),
});

export const DoctorWorkHistorySchema = Joi.object({
	company: Joi.string().min(2).required(),
	designation: Joi.string().min(2).required(),
	startDate: Joi.date().required(),
	endDate: Joi.date().min(Joi.ref("startDate")).optional().allow(null).messages({
		"date.min": "End date cannot be before start date",
	}),
});

export const DoctorSpecialtiesSchema = Joi.object({
	specialityIds: Joi.array()
		.items(Joi.number().required())
		.min(1)
		.required(),
	yearsOfExperience: Joi.number().min(0).optional(),
	bio: Joi.string().allow("", null).optional(),
});
