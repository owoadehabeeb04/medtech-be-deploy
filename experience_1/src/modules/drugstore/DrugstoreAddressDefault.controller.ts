import { INTERNAL_SERVER_ERROR } from "http-status";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";
import { addressIdParamSchema } from "./Drugstore.schema";
import { DrugstoreAddressService } from "./DrugstoreAddress.service";

const handleResponse = async (
	req: Request,
	res: Response,
	next: NextFunction,
	serviceCall: Promise<any>,
	errorSuffix: string
) => {
	const { manageApplicationErrors, manageAsyncOps, errorCode, encrypt } = req.context;
	const [error, data] = await manageAsyncOps(serviceCall);

	if (error) {
		return next(
			manageApplicationErrors({
				message: error.message,
				statusCode: INTERNAL_SERVER_ERROR,
				errorCode: errorCode(ERR_USER, errorSuffix),
			})
		);
	}

	if (!data.status) {
		return next(
			manageApplicationErrors({
				message: data.message,
				statusCode: data.code || INTERNAL_SERVER_ERROR,
				errorCode: errorCode(ERR_USER, errorSuffix),
			})
		);
	}

	res.response = {
		message: data.message,
		statusCode: data.code,
		data: encrypt(data.data),
	};

	return next();
};

/**
 * @swagger
 * /api/v1/main/drugstore/addresses/{addressId}/default:
 *   patch:
 *     summary: Set an address as the caller's default
 *     description: Lightweight alternative to PATCH /drugstore/addresses/{addressId} for this one action — doesn't require resending the full address payload.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: addressId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Default address updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Default address updated successfully" }
 *                 data: { $ref: '#/components/schemas/DrugstoreAddressResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Address not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const setDefaultAddress: RequestHandler = async (req, res, next) => {
	const params = req.context.validateSchema(addressIdParamSchema, req.params, next);
	if (!params) return;

	return handleResponse(req, res, next, DrugstoreAddressService.setDefault(req.context.user.id, params.addressId), "D195");
};
