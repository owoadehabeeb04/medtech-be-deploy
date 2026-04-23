import Joi from "joi";

export const DoctorReviewAppointmentParamsSchema = Joi.object({
	appointmentId: Joi.number().integer().positive().required(),
});

export const DoctorReviewParamsSchema = Joi.object({
	reviewId: Joi.number().integer().positive().required(),
});

export const CreateDoctorReviewSchema = Joi.object({
	rating: Joi.number().integer().min(1).max(5).required(),
	comment: Joi.string().trim().min(1).max(1000).required(),
});

export const CreateDoctorReviewReplySchema = Joi.object({
	message: Joi.string().trim().min(1).max(400).required(),
});

export const GetDoctorReviewsQuerySchema = Joi.object({
	limit: Joi.number().integer().min(1).max(50).default(10),
	cursorCreatedAt: Joi.date().iso().optional(),
	cursorId: Joi.number().integer().positive().optional(),
}).and("cursorCreatedAt", "cursorId");
