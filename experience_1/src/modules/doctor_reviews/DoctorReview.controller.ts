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

export const getDoctorReviewSummary: RequestHandler = async (req, res, next) =>
	handleResponse(req, res, next, DoctorReviewService.getDoctorReviewSummary(req.context.user.id), "702");

export const getDoctorReviews: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(GetDoctorReviewsQuerySchema, req.query, next);
	if (!payload) return;

	return handleResponse(req, res, next, DoctorReviewService.getDoctorReviews(req.context.user.id, payload), "703");
};

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
