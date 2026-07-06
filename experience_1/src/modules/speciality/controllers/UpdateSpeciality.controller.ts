import { NextFunction, Request, RequestHandler, Response } from "express";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { ERR_USER } from "../../../constants/error-codes";
import { UpdateSpecialitySchema } from "../Speciality.schema";
import { SpecialityService } from "../Speciality.service";

/**
 * @swagger
 * /api/v1/main/specialities/id/{id}:
 *   put:
 *     summary: Update a speciality
 *     description: All body fields are optional — only supplied fields are changed.
 *     tags: [Specialities]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SpecialityUpdateRequest' }
 *     responses:
 *       200:
 *         description: Speciality updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Speciality updated successfully" }
 *                 data: { $ref: '#/components/schemas/SpecialityResponse' }
 *       400: { description: Validation failed, or the new key is already in use, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Speciality not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
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
