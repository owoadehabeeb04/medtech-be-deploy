import { NextFunction, Request, RequestHandler, Response } from "express";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { ERR_USER } from "../../../constants/error-codes";
import { SpecialityService } from "../Speciality.service";

/**
 * @swagger
 * /api/v1/main/specialities/all:
 *   get:
 *     summary: List active specialities
 *     description: Despite the route name, only returns specialities where isActive is true, ordered by name.
 *     tags: [Specialities]
 *     responses:
 *       200:
 *         description: Specialities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Specialities retrieved successfully" }
 *                 data: { type: array, items: { $ref: '#/components/schemas/SpecialityResponse' } }
 */
export const getAllSpecialities: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt, user } = req.context;

	const [error, data] = await manageAsyncOps(SpecialityService.getAllSpecialities());

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "304") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "305") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};
