import { NextFunction, Request, RequestHandler, Response } from "express";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { ERR_USER } from "../../../constants/error-codes";
import { MedicCompleteProfileSchema } from "../User.schema";
import { UserService } from "../User.service";

export const medicCompleteProfile: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt, user, sequelize} = req.context;

	const cleanBody = sanitizeBody(req.body);

	const payload = validateSchema(MedicCompleteProfileSchema, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(UserService.medicCompleteProfile(payload, user, sequelize));
	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "206") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "207") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};
