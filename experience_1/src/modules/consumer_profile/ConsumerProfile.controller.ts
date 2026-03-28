import { INTERNAL_SERVER_ERROR } from "http-status";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";
import { ConsumerProfileSchema } from "./ConsumerProfile.schema";
import { ConsumerProfileService } from "./ConsumerProfile.service";

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

export const createConsumerProfile: RequestHandler = async (req, res, next) => {
	const { validateSchema, sanitizeBody, user } = req.context;
	const payload = validateSchema(ConsumerProfileSchema, sanitizeBody(req.body), next);
	if (!payload) return;
	return handleResponse(req, res, next, ConsumerProfileService.upsertProfile(user.id, payload), "401");
};

export const updateConsumerProfile: RequestHandler = async (req, res, next) => {
	const { validateSchema, sanitizeBody, user } = req.context;
	const payload = validateSchema(ConsumerProfileSchema, sanitizeBody(req.body), next);
	if (!payload) return;
	return handleResponse(req, res, next, ConsumerProfileService.upsertProfile(user.id, payload), "402");
};

export const getConsumerProfile: RequestHandler = async (req, res, next) => {
	const { user } = req.context;
	return handleResponse(req, res, next, ConsumerProfileService.getProfile(user.id), "403");
};

export const skipConsumerProfile: RequestHandler = async (req, res, next) => {
	const { user } = req.context;
	return handleResponse(req, res, next, ConsumerProfileService.skipProfile(user.id), "404");
};

export const uploadConsumerProfileImage: RequestHandler = async (req, res, next) => {
	const { manageApplicationErrors, errorCode, user } = req.context;
	if (!req.file) {
		return next(
			manageApplicationErrors({
				message: "Profile image file is required",
				statusCode: 400,
				errorCode: errorCode(ERR_USER, "405"),
			})
		);
	}
	return handleResponse(req, res, next, ConsumerProfileService.uploadProfileImage(user.id, req.file), "405");
};
