import Joi from "joi";

export const BookAppointmentSchema = Joi.object({
	patientName: Joi.string().optional(),
	gender: Joi.string().optional(),
	age: Joi.number().required(),
	medicId: Joi.number().required(),
	scheduleDate: Joi.date().required(),
	consultationType: Joi.string().required(),
	appointmentType: Joi.string().required(),
});


