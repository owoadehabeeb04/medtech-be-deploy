import { INTERNAL_SERVER_ERROR } from "http-status";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";
import {
	DoctorDeviceTokenParamsSchema,
	UpdateDoctorSettingsPreferencesSchema,
	UpsertDoctorDeviceTokenSchema,
} from "./DoctorSettings.schema";
import { DoctorSettingsService } from "./DoctorSettings.service";

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
 * /api/v1/main/doctor/settings:
 *   get:
 *     summary: Get doctor app settings
 *     tags: [Doctor Settings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Doctor settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor settings retrieved successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorSettingsResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getDoctorSettings: RequestHandler = async (req, res, next) =>
	handleResponse(req, res, next, DoctorSettingsService.getSettings(req.context.user.id), "601");

/**
 * @swagger
 * /api/v1/main/doctor/settings/preferences:
 *   patch:
 *     summary: Update doctor app preferences
 *     description: At least one field required.
 *     tags: [Doctor Settings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DoctorSettingsPreferencesRequest' }
 *     responses:
 *       200:
 *         description: Doctor settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor settings updated successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorSettingsResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const updateDoctorSettingsPreferences: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(UpdateDoctorSettingsPreferencesSchema, req.body, next);
	if (!payload) return;

	return handleResponse(req, res, next, DoctorSettingsService.updatePreferences(req.context.user.id, payload), "602");
};

/**
 * @swagger
 * /api/v1/main/doctor/settings/device-token:
 *   post:
 *     summary: Save or update a push-notification device token
 *     description: Upserts by (doctorId, deviceId). Any other device-token row sharing the same deviceToken value is deactivated first, so a token can only be active on one device record at a time.
 *     tags: [Doctor Settings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DeviceTokenRequest' }
 *     responses:
 *       200:
 *         description: Doctor device token saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor device token saved successfully" }
 *                 data: { $ref: '#/components/schemas/DeviceTokenResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const upsertDoctorDeviceToken: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(UpsertDoctorDeviceTokenSchema, req.body, next);
	if (!payload) return;

	return handleResponse(
		req,
		res,
		next,
		DoctorSettingsService.upsertDeviceToken(req.context.user.id, payload, req.context.sequelize),
		"603"
	);
};

/**
 * @swagger
 * /api/v1/main/doctor/settings/device-tokens/{deviceId}:
 *   delete:
 *     summary: Remove a push-notification device token
 *     tags: [Doctor Settings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: deviceId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Doctor device token removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor device token removed successfully" }
 *                 data: { type: object, properties: { deviceId: { type: string }, isActive: { type: boolean, example: false } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Device token not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const deleteDoctorDeviceToken: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorDeviceTokenParamsSchema, req.params, next);
	if (!payload) return;

	return handleResponse(req, res, next, DoctorSettingsService.removeDeviceToken(req.context.user.id, payload.deviceId), "604");
};
