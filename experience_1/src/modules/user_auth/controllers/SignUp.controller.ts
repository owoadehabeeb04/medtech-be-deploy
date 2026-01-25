import { NextFunction, Request, RequestHandler, Response } from "express";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { SignUpSchema } from "../UserAuth.schema";
import { UserAuthService } from "../UserAuth.service";
import { ERR_USER } from "../../../constants/error-codes";

export const signup: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt, user } = req.context;

	const userType = req.params.userType;

	const cleanBody = sanitizeBody({ ...req.body, userType }, ["email", "password"]);

	const payload = validateSchema(SignUpSchema, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(UserAuthService.signup(payload, req));
	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "109") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "110") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};
