import Joi from "joi";

export const CreateCustomerUserNameSchema = Joi.object({
	userName: Joi.string().required(),
});

export const CompleteCustomerProfileSchema = Joi.object({
	dialCode: Joi.string().required(),
	phoneNumber: Joi.string().required(),
	dob: Joi.date().required(),
	houseNumber: Joi.string().optional(),
	street: Joi.string().optional(),
	lga: Joi.string().optional(),
	state: Joi.string().optional(),
	profilePicture: Joi.string().required(),
});

export const MedicCompleteProfileSchema = Joi.object({
	address: Joi.object({
		line1: Joi.string().optional(),
		line2: Joi.string().optional(),
		city: Joi.string().optional(),
		state: Joi.string().optional(),
	}).required(),
	education: Joi.array().items(
		Joi.object({
			institution: Joi.string().required(),
			certificate: Joi.string().required(),
			startDate: Joi.date().required(),
			endDate: Joi.date().optional(),
		})
	).required(),
	workHistory: Joi.array().items(
		Joi.object({
			company: Joi.string().required(),
			designation: Joi.string(),
			startDate: Joi.date().required(),
			endDate: Joi.date().optional(),
		}).required()
	),
	speciality: Joi.array()
		.items(
			Joi.object({
				specialityId: Joi.number().required(),
				yearsOfExperience: Joi.number().required(),
				bio: Joi.string().optional(),
			})
		)
		.required(),
});

export const GetMedicBySpecialitySchema = Joi.object({
	specialityId: Joi.number().required(),
});