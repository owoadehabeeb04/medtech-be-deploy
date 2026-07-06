import { INTERNAL_SERVER_ERROR } from "http-status";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";
import {
	CreateDoctorReviewReplySchema,
	CreateDoctorReviewSchema,
	DoctorReviewAppointmentParamsSchema,
	DoctorReviewParamsSchema,
	GetDoctorReviewsQuerySchema,
} from "./DoctorReview.schema";
import { DoctorReviewService } from "./DoctorReview.service";

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

	if (!data.status) {
		return next(
			manageApplicationErrors({
				message: data.message,
				statusCode: data.code || INTERNAL_SERVER_ERROR,
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
 * /api/v1/main/appointments/{appointmentId}/review:
 *   post:
 *     summary: Review a completed appointment
 *     description: Consumer-only. Can only be submitted for the caller's own appointment, only once it's completed, and only once ever.
 *     tags: [Doctor Reviews]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: appointmentId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ConsumerReviewRequest' }
 *     responses:
 *       201:
 *         description: Doctor review created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor review created successfully" }
 *                 data: { $ref: '#/components/schemas/ConsumerReviewResponse' }
 *       400: { description: "Appointment not completed, not linked to a doctor, or already reviewed", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: "Forbidden — not the caller's own appointment, or caller is not a consumer", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Appointment not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const createAppointmentReview: RequestHandler = async (req, res, next) => {
	const params = req.context.validateSchema(DoctorReviewAppointmentParamsSchema, req.params, next);
	if (!params) return;
	const payload = req.context.validateSchema(CreateDoctorReviewSchema, req.body, next);
	if (!payload) return;

	return handleResponse(
		req,
		res,
		next,
		DoctorReviewService.createReview(req.context.user.id, params.appointmentId, payload, req.context.sequelize),
		"701"
	);
};

/**
 * @swagger
 * /api/v1/main/doctor/reviews/summary:
 *   get:
 *     summary: Get the doctor's review summary
 *     tags: [Doctor Reviews]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Doctor review summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor review summary retrieved successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorReviewSummaryResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getDoctorReviewSummary: RequestHandler = async (req, res, next) =>
	handleResponse(req, res, next, DoctorReviewService.getDoctorReviewSummary(req.context.user.id), "702");

/**
 * @swagger
 * /api/v1/main/doctor/reviews:
 *   get:
 *     summary: List the doctor's reviews
 *     description: Cursor-paginated. cursorCreatedAt and cursorId must be supplied together (both or neither) to fetch the next page.
 *     tags: [Doctor Reviews]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *       - name: cursorCreatedAt
 *         in: query
 *         schema: { type: string, format: date-time }
 *       - name: cursorId
 *         in: query
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Doctor reviews retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor reviews retrieved successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorReviewsListResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getDoctorReviews: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(GetDoctorReviewsQuerySchema, req.query, next);
	if (!payload) return;

	return handleResponse(req, res, next, DoctorReviewService.getDoctorReviews(req.context.user.id, payload), "703");
};

/**
 * @swagger
 * /api/v1/main/doctor/reviews/{reviewId}/reply:
 *   post:
 *     summary: Reply to a review
 *     description: A doctor can only reply to their own reviews, and only once per review.
 *     tags: [Doctor Reviews]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: reviewId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DoctorReplyRequest' }
 *     responses:
 *       201:
 *         description: Doctor review reply created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor review reply created successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorReplyResponse' }
 *       400: { description: A reply already exists for this review, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: "Forbidden — not the doctor's own review", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Review not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const createDoctorReviewReply: RequestHandler = async (req, res, next) => {
	const params = req.context.validateSchema(DoctorReviewParamsSchema, req.params, next);
	if (!params) return;
	const payload = req.context.validateSchema(CreateDoctorReviewReplySchema, req.body, next);
	if (!payload) return;

	return handleResponse(
		req,
		res,
		next,
		DoctorReviewService.createDoctorReply(req.context.user.id, params.reviewId, payload),
		"704"
	);
};
