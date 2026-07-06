import { NextFunction, Request, RequestHandler, Response } from "express";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { ERR_USER } from "../../../constants/error-codes";
import { BulkCreateSpecialities } from "../Speciality.schema";
import { SpecialityService } from "../Speciality.service";

/**
 * @swagger
 * /api/v1/main/specialities/bulk-create:
 *   post:
 *     summary: Bulk create specialities
 *     description: Each item is validated the same way as a single speciality create. Fails with 409 if any submitted key already exists.
 *     tags: [Specialities]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/BulkSpecialityRequest' }
 *     responses:
 *       200:
 *         description: Specialities created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Specialities created successfully" }
 *                 data: { type: array, items: { $ref: '#/components/schemas/SpecialityResponse' } }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409:
 *         description: One or more submitted keys already exist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Duplicate keys found" }
 *                 data: { type: object, properties: { duplicates: { type: array, items: { type: string } } } }
 */
export const bulkCreateSpecialities: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt, user } = req.context;

	const cleanBody = sanitizeBody(req.body);

	const payload = validateSchema(BulkCreateSpecialities, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(SpecialityService.bulkCreateSpecialities(payload.specialities));

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "310") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "311") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};
