import { NextFunction, Request, RequestHandler, Response } from "express";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { ERR_USER } from "../../../constants/error-codes";
import { GetUserTypePermissionsSchema } from "../Permission.schema";
import { PermissionService } from "../Permission.service";

export const getUserTypePermissions: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt } = req.context;

	const cleanBody = sanitizeBody(req.params);

	const payload = validateSchema(GetUserTypePermissionsSchema, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(PermissionService.getUserTypePermissions(payload.userTypeId));

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "129") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "130") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};
