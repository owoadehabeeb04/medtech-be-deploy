import { NextFunction, Request, RequestHandler, Response } from "express";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { LoginSchema } from "../UserAuth.schema";
import { UserAuthService } from "../UserAuth.service";
import { ERR_USER } from "../../../constants/error-codes";

export const login: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt, user } = req.context;

	const userType = req.params.userType;

	const cleanBody = sanitizeBody({ ...req.body, userType }, ["email", "password"]);

	const payload = validateSchema(LoginSchema, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(UserAuthService.login(payload));

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "100") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "102") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};
