import { NextFunction, Request, RequestHandler, Response } from "express";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { ERR_USER } from "../../../constants/error-codes";
import { CommonSpecialitySchema } from "../Speciality.schema";
import { SpecialityService } from "../Speciality.service";

/**
 * @swagger
 * /api/v1/main/specialities/id/{id}:
 *   get:
 *     summary: Get a speciality by ID
 *     tags: [Specialities]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success." }
 *                 data: { $ref: '#/components/schemas/SpecialityResponse' }
 *       404: { description: Speciality not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getSpecialityById: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt, user } = req.context;

	const cleanBody = sanitizeBody(req.params);

	const payload = validateSchema(CommonSpecialitySchema, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(SpecialityService.getSpecialityById(payload.id));

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "306") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "307") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};
