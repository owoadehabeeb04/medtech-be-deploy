import { NextFunction, Request, RequestHandler, Response } from "express";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import {  SetPasswordSchema } from "../UserAuth.schema";
import { UserAuthService } from "../UserAuth.service";
import { ERR_USER } from "../../../constants/error-codes";

export const setPassword: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt, user } = req.context;

	const cleanBody = sanitizeBody(req.body, ["password"]);

	const payload = validateSchema(SetPasswordSchema, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(UserAuthService.setPassword(payload.sessionId, payload.password));
	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "107") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "108") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};
