import { INTERNAL_SERVER_ERROR } from "http-status";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";
import { DoctorRatesService } from "./DoctorRates.service";
import { ReplaceDoctorSubscriptionPlansSchema, UpsertDoctorConsultationRateSchema } from "./DoctorRates.schema";

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
 * /api/v1/main/doctor/rates:
 *   get:
 *     summary: Get the doctor's rates
 *     description: Returns the current consultation rate, active subscription plans, and a count of the doctor's health packages.
 *     tags: [Doctor Rates]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Doctor rates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor rates retrieved successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorRatesResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getDoctorRates: RequestHandler = async (req, res, next) =>
	handleResponse(req, res, next, DoctorRatesService.getRates(req.context.user.id), "611");

/**
 * @swagger
 * /api/v1/main/doctor/rates/consultation:
 *   put:
 *     summary: Upsert the doctor's single consultation rate
 *     tags: [Doctor Rates]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ConsultationRateRequest' }
 *     responses:
 *       200:
 *         description: Doctor consultation rate saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor consultation rate saved successfully" }
 *                 data: { type: object, properties: { consultationRate: { type: object } } }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const upsertDoctorConsultationRate: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(UpsertDoctorConsultationRateSchema, req.body, next);
	if (!payload) return;

	return handleResponse(req, res, next, DoctorRatesService.upsertConsultationRate(req.context.user.id, payload), "612");
};

/**
 * @swagger
 * /api/v1/main/doctor/rates/subscription-plans:
 *   put:
 *     summary: Replace the doctor's subscription plans
 *     description: Transactionally deactivates all existing active plans and creates the given list fresh. Amounts are stored in kobo internally; submit amountNgn.
 *     tags: [Doctor Rates]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SubscriptionPlansRequest' }
 *     responses:
 *       200:
 *         description: Doctor subscription plans saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor subscription plans saved successfully" }
 *                 data: { type: object, properties: { subscriptionPlans: { type: array, items: { type: object } } } }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const replaceDoctorSubscriptionPlans: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(ReplaceDoctorSubscriptionPlansSchema, req.body, next);
	if (!payload) return;

	return handleResponse(
		req,
		res,
		next,
		DoctorRatesService.replaceSubscriptionPlans(req.context.user.id, payload, req.context.sequelize),
		"613"
	);
};
