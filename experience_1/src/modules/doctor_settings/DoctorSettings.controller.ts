import { INTERNAL_SERVER_ERROR } from "http-status";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";
import {
	DoctorDeviceTokenParamsSchema,
	UpdateDoctorSettingsPreferencesSchema,
	UpsertDoctorDeviceTokenSchema,
} from "./DoctorSettings.schema";
import { DoctorSettingsService } from "./DoctorSettings.service";

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

export const getDoctorSettings: RequestHandler = async (req, res, next) =>
	handleResponse(req, res, next, DoctorSettingsService.getSettings(req.context.user.id), "601");

export const updateDoctorSettingsPreferences: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(UpdateDoctorSettingsPreferencesSchema, req.body, next);
	if (!payload) return;

	return handleResponse(req, res, next, DoctorSettingsService.updatePreferences(req.context.user.id, payload), "602");
};

export const upsertDoctorDeviceToken: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(UpsertDoctorDeviceTokenSchema, req.body, next);
	if (!payload) return;

	return handleResponse(
		req,
		res,
		next,
		DoctorSettingsService.upsertDeviceToken(req.context.user.id, payload, req.context.sequelize),
		"603"
	);
};

export const deleteDoctorDeviceToken: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorDeviceTokenParamsSchema, req.params, next);
	if (!payload) return;

	return handleResponse(req, res, next, DoctorSettingsService.removeDeviceToken(req.context.user.id, payload.deviceId), "604");
};
