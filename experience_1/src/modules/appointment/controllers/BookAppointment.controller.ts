import { NextFunction, Request, RequestHandler, Response } from "express";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { ERR_USER } from "../../../constants/error-codes";
import { BookAppointmentSchema } from "../Appointment.schema";
import { AppointmentService } from "../Appointment.service";

/**
 * @swagger
 * /api/v1/main/appointments/book:
 *   post:
 *     summary: Book an appointment
 *     description: When appointmentType is "personal", patientName/gender are derived from the logged-in user if omitted. consultationType is looked up by key (auto-created outside production).
 *     tags: [Appointments]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/BookAppointmentRequest' }
 *     responses:
 *       200:
 *         description: Appointment booked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Appointment booked successfully" }
 *                 data: { $ref: '#/components/schemas/AppointmentResponse' }
 *       400: { description: Validation failed, or consultation type not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const bookAppointment: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt, user } = req.context;

	const cleanBody = sanitizeBody(req.body);

	const payload = validateSchema(BookAppointmentSchema, cleanBody, next);

	if (!payload) return;

	payload.appointmentBookedBy = user.id;

	const [error, data] = await manageAsyncOps(AppointmentService.bookAppointment(payload));

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "400") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "401") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};
