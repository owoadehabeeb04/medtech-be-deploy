import { NextFunction, Request, RequestHandler, Response } from "express";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { ERR_USER } from "../../../constants/error-codes";
import { AssignPermissionToUserSchema } from "../Permission.schema";
import { PermissionService } from "../Permission.service";

export const assignPermissionsToUserType: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt } = req.context;

	const cleanBody = sanitizeBody(req.body);

	const payload = validateSchema(AssignPermissionToUserSchema, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(PermissionService.assignPermissionsToUserType(payload));

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "121") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "122") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};
