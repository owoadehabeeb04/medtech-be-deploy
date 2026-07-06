import { INTERNAL_SERVER_ERROR } from "http-status";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";
import { savedCardIdParamSchema } from "./DrugstoreSavedCard.schema";
import { DrugstoreSavedCardService } from "./DrugstoreSavedCard.service";

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
 * /api/v1/main/drugstore/payment-methods:
 *   get:
 *     summary: List the caller's saved cards
 *     description: "Cards are saved automatically when checkout is completed with saveCard=true. Only masked details (last4, brand, expiry) are ever returned — the underlying Paystack authorization code is never exposed."
 *     tags: [Drugstore Wallet]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success." }
 *                 data: { type: array, items: { $ref: '#/components/schemas/SavedCardResponse' } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const listSavedCards: RequestHandler = async (req, res, next) =>
	handleResponse(req, res, next, DrugstoreSavedCardService.listSavedCards(req.context.user.id), "D180");

/**
 * @swagger
 * /api/v1/main/drugstore/payment-methods/{cardId}:
 *   delete:
 *     summary: Remove a saved card
 *     tags: [Drugstore Wallet]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: cardId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Saved card removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Saved card removed successfully" }
 *                 data: { type: object, properties: { id: { type: string, format: uuid } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Saved card not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const deleteSavedCard: RequestHandler = async (req, res, next) => {
	const params = req.context.validateSchema(savedCardIdParamSchema, req.params, next);
	if (!params) return;

	return handleResponse(req, res, next, DrugstoreSavedCardService.deleteSavedCard(req.context.user.id, params.cardId), "D181");
};
