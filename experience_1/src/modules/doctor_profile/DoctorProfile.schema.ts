import Joi from "joi";

const phoneNumberSchema = Joi.string()
	.trim()
	.pattern(/^[0-9+()\-\s]{7,20}$/)
	.messages({
		"string.pattern.base": "Phone number format is invalid",
	});

export const DoctorAccountSchema = Joi.object({
	firstName: Joi.string().trim().min(2).max(40).optional(),
	lastName: Joi.string().trim().min(2).max(40).optional(),
	phoneNumber: phoneNumberSchema.optional(),
	email: Joi.any().forbidden().messages({
		"any.unknown": "Email cannot be changed from this endpoint",
		"any.forbidden": "Email cannot be changed from this endpoint",
	}),
}).min(1);

export const DoctorBasicProfileSchema = Joi.object({
	firstName: Joi.string().trim().min(2).max(40).optional(),
	lastName: Joi.string().trim().min(2).max(40).optional(),
	phoneNumber: phoneNumberSchema.optional(),
	medicalLicenseNumber: Joi.string().trim().min(3).max(100).optional(),
	yearsOfExperience: Joi.number().min(0).optional(),
	bio: Joi.string().trim().max(1000).allow("", null).optional(),
}).min(1);

export const DoctorImageSchema = Joi.object({});

export const DoctorAddressSchema = Joi.object({
	addressLine1: Joi.string().trim().min(2).max(255).required(),
	addressLine2: Joi.string().trim().max(255).allow("", null).optional(),
	city: Joi.string().trim().min(2).max(100).required(),
	state: Joi.string().trim().min(2).max(100).required(),
	country: Joi.string().trim().min(2).max(100).allow("", null).optional(),
	postalCode: Joi.string().trim().min(3).max(20).pattern(/^[A-Za-z0-9 -]+$/).allow("", null).optional().messages({
		"string.pattern.base": "Postal code format is invalid",
	}),
});

export const DoctorEducationSchema = Joi.object({
	institution: Joi.string().trim().min(2).max(255).optional(),
	institute: Joi.string().trim().min(2).max(255).optional(),
	certificate: Joi.string().trim().min(2).max(255).required(),
	startDate: Joi.date().required(),
	endDate: Joi.date().min(Joi.ref("startDate")).optional().allow(null).messages({
		"date.min": "End date cannot be before start date",
	}),
}).or("institution", "institute");

export const DoctorWorkHistorySchema = Joi.object({
	companyOrInstitution: Joi.string().trim().min(2).max(255).optional(),
	company: Joi.string().trim().min(2).max(255).optional(),
	designation: Joi.string().trim().min(2).max(255).required(),
	startDate: Joi.date().required(),
	endDate: Joi.date().min(Joi.ref("startDate")).optional().allow(null).messages({
		"date.min": "End date cannot be before start date",
	}),
}).or("companyOrInstitution", "company");

export const DoctorSpecialtiesSchema = Joi.object({
	specialityIds: Joi.array()
		.items(Joi.number().required())
		.min(1)
		.optional(),
	specialtyIds: Joi.array()
		.items(Joi.number().required())
		.min(1)
		.optional(),
	yearsOfExperience: Joi.number().min(0).optional(),
	bio: Joi.string().trim().max(1000).allow("", null).optional(),
}).or("specialityIds", "specialtyIds");
