import { INTERNAL_SERVER_ERROR } from "http-status";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";
import { DoctorRatesService } from "./DoctorRates.service";
import { ReplaceDoctorSubscriptionPlansSchema, UpsertDoctorConsultationRateSchema } from "./DoctorRates.schema";

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

export const getDoctorRates: RequestHandler = async (req, res, next) =>
	handleResponse(req, res, next, DoctorRatesService.getRates(req.context.user.id), "611");

export const upsertDoctorConsultationRate: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(UpsertDoctorConsultationRateSchema, req.body, next);
	if (!payload) return;

	return handleResponse(req, res, next, DoctorRatesService.upsertConsultationRate(req.context.user.id, payload), "612");
};

export const replaceDoctorSubscriptionPlans: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(ReplaceDoctorSubscriptionPlansSchema, req.body, next);
	if (!payload) return;

	return handleResponse(
		req,
		res,
		next,
		DoctorRatesService.replaceSubscriptionPlans(req.context.user.id, payload, req.context.sequelize),
		"613"
	);
};
