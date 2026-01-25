import { NextFunction, Request, Response } from "express";
import { HealthService } from "./Health.service";
import { ERR_USER } from "../../constants/error-codes";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";

export const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, errorCode } = req.context;

	const [error, data] = await manageAsyncOps(HealthService.checkAll());

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "100") }));
	}

	if (!data.status) return next(manageApplicationErrors({ message: data.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "101") }));

	res.response = {
		statusCode: OK,
		message: data.message,
		data: data.data,
	};

	return next();
};
