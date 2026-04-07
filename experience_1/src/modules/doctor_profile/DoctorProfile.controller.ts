import { INTERNAL_SERVER_ERROR } from "http-status";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";
import {
	DoctorAccountSchema,
	DoctorAddressSchema,
	DoctorBasicProfileSchema,
	DoctorEducationSchema,
	DoctorSpecialtiesSchema,
	DoctorWorkHistorySchema,
} from "./DoctorProfile.schema";
import { DoctorProfileService } from "./DoctorProfile.service";

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

export const getDoctorProfile: RequestHandler = async (req, res, next) => {
	return handleResponse(req, res, next, DoctorProfileService.getProfile(req.context.user.id), "501");
};

export const getDoctorProfileMe: RequestHandler = async (req, res, next) => {
	return handleResponse(req, res, next, DoctorProfileService.getProfileMe(req.context.user.id), "501A");
};

export const updateDoctorAccount: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorAccountSchema, req.body, next);
	if (!payload) return;
	return handleResponse(req, res, next, DoctorProfileService.updateAccount(req.context.user.id, payload), "501B");
};

export const createDoctorBasicProfile: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorBasicProfileSchema, req.body, next);
	if (!payload) return;
	return handleResponse(req, res, next, DoctorProfileService.upsertBasic(req.context.user.id, payload), "502");
};

export const updateDoctorBasicProfile: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorBasicProfileSchema, req.body, next);
	if (!payload) return;
	return handleResponse(req, res, next, DoctorProfileService.upsertBasic(req.context.user.id, payload), "503");
};

export const updateDoctorImage: RequestHandler = async (req, res, next) => {
	const { manageApplicationErrors, errorCode } = req.context;
	if (!req.file) {
		return next(
			manageApplicationErrors({
				message: "Profile image file is required",
				statusCode: 400,
				errorCode: errorCode(ERR_USER, "504"),
			})
		);
	}
	return handleResponse(req, res, next, DoctorProfileService.updateImage(req.context.user.id, req.file), "504");
};

export const updateDoctorAddress: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorAddressSchema, req.body, next);
	if (!payload) return;
	return handleResponse(req, res, next, DoctorProfileService.updateAddress(req.context.user.id, payload), "505");
};

export const listDoctorEducationHistory: RequestHandler = async (req, res, next) => {
	return handleResponse(req, res, next, DoctorProfileService.listEducationHistory(req.context.user.id), "505A");
};

export const createDoctorEducation: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorEducationSchema, req.body, next);
	if (!payload) return;
	return handleResponse(req, res, next, DoctorProfileService.createEducation(req.context.user.id, payload), "506");
};

export const updateDoctorEducation: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorEducationSchema, req.body, next);
	if (!payload) return;
	return handleResponse(
		req,
		res,
		next,
		DoctorProfileService.updateEducation(req.context.user.id, Number(req.params.educationId), payload),
		"507"
	);
};

export const deleteDoctorEducation: RequestHandler = async (req, res, next) => {
	return handleResponse(
		req,
		res,
		next,
		DoctorProfileService.deleteEducation(req.context.user.id, Number(req.params.educationId)),
		"508"
	);
};

export const listDoctorWorkHistory: RequestHandler = async (req, res, next) => {
	return handleResponse(req, res, next, DoctorProfileService.listWorkHistory(req.context.user.id), "508A");
};

export const createDoctorWorkHistory: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorWorkHistorySchema, req.body, next);
	if (!payload) return;
	return handleResponse(req, res, next, DoctorProfileService.createWorkHistory(req.context.user.id, payload), "509");
};

export const updateDoctorWorkHistory: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorWorkHistorySchema, req.body, next);
	if (!payload) return;
	return handleResponse(
		req,
		res,
		next,
		DoctorProfileService.updateWorkHistory(req.context.user.id, Number(req.params.workId), payload),
		"510"
	);
};

export const deleteDoctorWorkHistory: RequestHandler = async (req, res, next) => {
	return handleResponse(
		req,
		res,
		next,
		DoctorProfileService.deleteWorkHistory(req.context.user.id, Number(req.params.workId)),
		"511"
	);
};

export const createDoctorSpecialties: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorSpecialtiesSchema, req.body, next);
	if (!payload) return;
	return handleResponse(req, res, next, DoctorProfileService.replaceSpecialties(req.context.user.id, payload), "512");
};

export const updateDoctorSpecialties: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorSpecialtiesSchema, req.body, next);
	if (!payload) return;
	return handleResponse(req, res, next, DoctorProfileService.replaceSpecialties(req.context.user.id, payload), "513");
};

export const completeDoctorOnboarding: RequestHandler = async (req, res, next) => {
	return handleResponse(req, res, next, DoctorProfileService.completeOnboarding(req.context.user.id), "514");
};
