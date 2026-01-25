import { NextFunction, Request, RequestHandler, Response } from "express";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { ERR_USER } from "../../../constants/error-codes";
import { UpdateSpecialitySchema } from "../Speciality.schema";
import { SpecialityService } from "../Speciality.service";

export const updateSpeciality: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt, user } = req.context;

	const cleanBody = sanitizeBody({ ...req.params, ...req.body }, ["key"]);

	const payload = validateSchema(UpdateSpecialitySchema, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(SpecialityService.updateSpeciality(payload.id, payload));

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
