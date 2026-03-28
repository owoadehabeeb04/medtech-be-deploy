import { NextFunction, Request, RequestHandler, Response } from "express";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { ResetPasswordSchema } from "../UserAuth.schema";
import { UserAuthService } from "../UserAuth.service";
import { ERR_USER } from "../../../constants/error-codes";

export const resetPassword: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt, user } = req.context;

	const cleanBody = sanitizeBody({ ...req.body }, ["newPassword"]);

	const payload = validateSchema(ResetPasswordSchema, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(UserAuthService.resetPasswordLegacy(payload.sessionId, payload.newPassword));

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "105") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "106") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};
