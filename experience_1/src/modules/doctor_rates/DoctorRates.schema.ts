import Joi from "joi";

export const UpsertDoctorConsultationRateSchema = Joi.object({
	amountNgn: Joi.number().positive().required(),
	durationMinutes: Joi.number().integer().positive().required(),
});

export const ReplaceDoctorSubscriptionPlansSchema = Joi.object({
	plans: Joi.array()
		.items(
			Joi.object({
				title: Joi.string().trim().min(1).max(150).required(),
				amountNgn: Joi.number().positive().required(),
				durationDays: Joi.number().integer().positive().required(),
				sortOrder: Joi.number().integer().min(0).optional(),
			})
		)
		.min(1)
		.required(),
});
