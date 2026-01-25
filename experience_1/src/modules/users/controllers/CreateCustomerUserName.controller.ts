import { NextFunction, Request, RequestHandler, Response } from "express";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { ERR_USER } from "../../../constants/error-codes";
import { CreateCustomerUserNameSchema } from "../User.schema";
import { UserService } from "../User.service";

export const createCustomerUserName: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt, user } = req.context;

	const cleanBody = sanitizeBody(req.body, ["userName"]);

	const payload = validateSchema(CreateCustomerUserNameSchema, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(UserService.createCustomerUserName(payload, user));

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "202") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "203") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};
