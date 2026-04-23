import { NextFunction, Request, RequestHandler, Response } from "express";
import { CommonUserTypeSchema, CreateUserTypeSchema, UpdateUserTypeSchema } from "./UserTypes.schema";
import { UserTypeService } from "./UserType.service";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { ERR_USER } from "../../constants/error-codes";

export const createUserType: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt } = req.context;

	const cleanBody = sanitizeBody(req.body, ["name","key"]);

	const payload = validateSchema(CreateUserTypeSchema, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(UserTypeService.createUserType(payload));

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "300") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "301") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};

export const getAllUserTypes: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt } = req.context;

	const [error, data] = await manageAsyncOps(UserTypeService.getAllUserTypes());

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "302") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "303") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};

export const getUserTypeById: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt } = req.context;

	const cleanBody = sanitizeBody(req.params);

	const payload = validateSchema(CommonUserTypeSchema, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(UserTypeService.getUserTypeById(payload.userTypeId));

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "304") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "305") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};

export const updateUserType: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt } = req.context;

	const cleanBody = sanitizeBody(req.body);

	const payload = validateSchema(UpdateUserTypeSchema, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(UserTypeService.updateUserType(payload.userTypeId, payload));

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "306") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "307") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};

export const deleteUserType: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt } = req.context;

	const cleanBody = sanitizeBody(req.params);

	const payload = validateSchema(CommonUserTypeSchema, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(UserTypeService.deleteUserType(payload.userTypeId));

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "308") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "309") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};
