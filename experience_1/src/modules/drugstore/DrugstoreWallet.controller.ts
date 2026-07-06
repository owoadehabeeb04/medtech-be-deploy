import { INTERNAL_SERVER_ERROR } from "http-status";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";
import { confirmWalletFundingSchema, fundWalletSchema, walletTransactionsQuerySchema } from "./DrugstoreWallet.schema";
import { DrugstoreWalletService } from "./DrugstoreWallet.service";

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
 * /api/v1/main/drugstore/wallet:
 *   get:
 *     summary: Get the caller's drugstore wallet balance
 *     description: Wallet is created lazily on first access with a zero balance.
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
 *                 data: { $ref: '#/components/schemas/DrugstoreWalletResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getDrugstoreWallet: RequestHandler = async (req, res, next) =>
	handleResponse(req, res, next, DrugstoreWalletService.getWallet(req.context.user.id), "D170");

/**
 * @swagger
 * /api/v1/main/drugstore/wallet/fund:
 *   post:
 *     summary: Initialize a wallet top-up
 *     description: Starts a Paystack transaction for the given amount. Call POST /drugstore/wallet/confirm-funding with the returned reference once the payment completes.
 *     tags: [Drugstore Wallet]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/FundWalletRequest' }
 *     responses:
 *       200:
 *         description: Wallet funding initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Wallet funding initialized successfully" }
 *                 data: { $ref: '#/components/schemas/WalletFundingInitResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const fundDrugstoreWallet: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(fundWalletSchema, req.body, next);
	if (!payload) return;

	const email = req.context.user?.email;
	if (!email) {
		const { manageApplicationErrors, errorCode } = req.context;
		return next(
			manageApplicationErrors({
				message: "User email is required to initialize payment",
				statusCode: 400,
				errorCode: errorCode(ERR_USER, "D171"),
			})
		);
	}

	return handleResponse(
		req,
		res,
		next,
		DrugstoreWalletService.initiateFunding(req.context.user.id, payload.amountNgn, email),
		"D171"
	);
};

/**
 * @swagger
 * /api/v1/main/drugstore/wallet/confirm-funding:
 *   post:
 *     summary: Confirm a wallet top-up
 *     description: Verifies the Paystack transaction and credits the wallet. Idempotent — confirming the same reference twice returns the already-credited balance rather than double-crediting.
 *     tags: [Drugstore Wallet]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ConfirmWalletFundingRequest' }
 *     responses:
 *       200:
 *         description: Wallet funded successfully (or already confirmed)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Wallet funded successfully" }
 *                 data: { $ref: '#/components/schemas/DrugstoreWalletResponse' }
 *       400: { description: Validation failed, or the payment was not successful, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const confirmDrugstoreWalletFunding: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(confirmWalletFundingSchema, req.body, next);
	if (!payload) return;

	return handleResponse(
		req,
		res,
		next,
		DrugstoreWalletService.confirmFunding(req.context.user.id, payload.paymentReference),
		"D172"
	);
};

/**
 * @swagger
 * /api/v1/main/drugstore/wallet/transactions:
 *   get:
 *     summary: List the caller's wallet transaction history
 *     tags: [Drugstore Wallet]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success." }
 *                 data: { $ref: '#/components/schemas/WalletTransactionsResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const listDrugstoreWalletTransactions: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(walletTransactionsQuerySchema, req.query, next);
	if (!payload) return;

	return handleResponse(
		req,
		res,
		next,
		DrugstoreWalletService.listTransactions(req.context.user.id, payload.page, payload.limit),
		"D173"
	);
};
