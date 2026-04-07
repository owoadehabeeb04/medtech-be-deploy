import { INTERNAL_SERVER_ERROR } from "http-status";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";
import {
	CreateDoctorHealthPackageSchema,
	DoctorHealthPackageParamsSchema,
	UpdateDoctorHealthPackageSchema,
} from "./DoctorHealthPackage.schema";
import { DoctorHealthPackageService } from "./DoctorHealthPackage.service";

type DoctorHealthPackageFilesMap = Record<string, Express.Multer.File[]>;

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

const getUploadedFiles = (req: Request) => {
	const files = (req.files || {}) as DoctorHealthPackageFilesMap;
	return {
		coverImage: files.coverImage?.[0],
		attachment: files.attachment?.[0],
	};
};

export const listDoctorHealthPackages: RequestHandler = async (req, res, next) =>
	handleResponse(req, res, next, DoctorHealthPackageService.listPackages(req.context.user.id), "621");

export const getDoctorHealthPackageDetails: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorHealthPackageParamsSchema, req.params, next);
	if (!payload) return;

	return handleResponse(
		req,
		res,
		next,
		DoctorHealthPackageService.getPackageDetails(req.context.user.id, Number(payload.packageId)),
		"622"
	);
};

export const createDoctorHealthPackage: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(CreateDoctorHealthPackageSchema, req.body, next);
	if (!payload) return;

	return handleResponse(
		req,
		res,
		next,
		DoctorHealthPackageService.createPackage(req.context.user.id, payload, getUploadedFiles(req)),
		"623"
	);
};

export const updateDoctorHealthPackage: RequestHandler = async (req, res, next) => {
	const params = req.context.validateSchema(DoctorHealthPackageParamsSchema, req.params, next);
	if (!params) return;

	const payload = req.context.validateSchema(UpdateDoctorHealthPackageSchema, req.body, next);
	if (!payload && Object.keys(req.body || {}).length > 0) return;

	const uploadedFiles = getUploadedFiles(req);
	const hasPayloadFields = Boolean(payload && Object.keys(payload).length > 0);
	if (!hasPayloadFields && !uploadedFiles.coverImage && !uploadedFiles.attachment) {
		const { manageApplicationErrors, errorCode } = req.context;
		return next(
			manageApplicationErrors({
				message: "At least one field or file update is required",
				statusCode: 400,
				errorCode: errorCode(ERR_USER, "624A"),
			})
		);
	}

	return handleResponse(
		req,
		res,
		next,
		DoctorHealthPackageService.updatePackage(req.context.user.id, Number(params.packageId), payload || {}, uploadedFiles),
		"624"
	);
};

export const deleteDoctorHealthPackage: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorHealthPackageParamsSchema, req.params, next);
	if (!payload) return;

	return handleResponse(
		req,
		res,
		next,
		DoctorHealthPackageService.deletePackage(req.context.user.id, Number(payload.packageId)),
		"625"
	);
};
