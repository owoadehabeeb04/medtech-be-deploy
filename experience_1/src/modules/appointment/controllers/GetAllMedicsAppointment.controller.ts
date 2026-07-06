import { NextFunction, Request, RequestHandler, Response } from "express";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { ERR_USER } from "../../../constants/error-codes";
import { BookAppointmentSchema } from "../Appointment.schema";
import { AppointmentService } from "../Appointment.service";

/**
 * @swagger
 * /api/v1/main/appointments:
 *   get:
 *     summary: List the doctor's appointments
 *     description: Requires the doctor's onboarding to be complete. Supports pagination plus optional status/date filters.
 *     tags: [Appointments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20 }
 *       - name: status
 *         in: query
 *         schema: { type: string, enum: [pending, confirmed, cancelled, checked-in, in-progress, completed, no-show] }
 *       - name: date
 *         in: query
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success." }
 *                 data: { $ref: '#/components/schemas/AppointmentListResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, or doctor onboarding is incomplete, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getAllMedicAppointments: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt, user } = req.context;

	const cleanBody = sanitizeBody(req.query);

	const [error, data] = await manageAsyncOps(AppointmentService.getAllMedicAppointments(user.id, cleanBody));

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "402") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "403") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};
