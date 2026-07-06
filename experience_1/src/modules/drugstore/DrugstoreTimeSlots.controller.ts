import { INTERNAL_SERVER_ERROR } from "http-status";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";
import { timeSlotsQuerySchema } from "./DrugstoreTimeSlots.schema";
import { DrugstoreTimeSlotsService } from "./DrugstoreTimeSlots.service";

const handleResponse = async (
	req: Request,
	res: Response,
	next: NextFunction,
	serviceCall: Promise<any>,
	errorSuffix: string
) => {
	const { manageApplicationErrors, manageAsyncOps, errorCode, encrypt } = req.context;
	const [error, data] = await manageAsyncOps(serviceCall);

	if (error) {
		return next(
			manageApplicationErrors({
				message: error.message,
				statusCode: INTERNAL_SERVER_ERROR,
				errorCode: errorCode(ERR_USER, errorSuffix),
			})
		);
	}

	res.response = {
		message: data.message,
		statusCode: data.code,
		data: encrypt(data.data),
	};

	return next();
};

/**
 * @swagger
 * /api/v1/main/drugstore/time-slots:
 *   get:
 *     summary: Get available delivery/pickup dates and time slots
 *     description: >
 *       Powers the "Choose a time slot" screen. Returns the next 5 selectable dates (orders
 *       cannot be scheduled further out) plus the fixed slot list per date, with already-passed
 *       slots filtered out for today. There is no pharmacy capacity/scheduling system behind this
 *       yet — slots are a fixed template, not a true availability check.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: fulfillmentMethod
 *         in: query
 *         schema: { type: string, enum: [delivery, pickup], default: delivery }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success." }
 *                 data: { $ref: '#/components/schemas/TimeSlotsResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getTimeSlots: RequestHandler = async (req, res, next) => {
	const query = req.context.validateSchema(timeSlotsQuerySchema, req.query, next);
	if (!query) return;

	return handleResponse(req, res, next, DrugstoreTimeSlotsService.getAvailableSlots(query.fulfillmentMethod), "D196");
};
