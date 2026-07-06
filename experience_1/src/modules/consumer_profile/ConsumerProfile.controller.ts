import { INTERNAL_SERVER_ERROR } from "http-status";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";
import { ConsumerProfileSchema } from "./ConsumerProfile.schema";
import { ConsumerProfileService } from "./ConsumerProfile.service";

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
 * /api/v1/main/consumer/profile:
 *   post:
 *     summary: Create the consumer's profile
 *     description: Upserts the caller's consumer profile. At least one field is required. Address pieces (houseNumber/streetName/localGovernmentArea/state) are merged server-side into a derived location string. Username uniqueness is checked before saving.
 *     tags: [Consumer Profile]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ConsumerProfileRequest' }
 *     responses:
 *       200:
 *         description: Consumer profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Consumer profile updated successfully" }
 *                 data: { $ref: '#/components/schemas/ConsumerProfileResponse' }
 *       400: { description: Validation failed, or the username is already taken, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a consumer, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: User not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const createConsumerProfile: RequestHandler = async (req, res, next) => {
	const { validateSchema, sanitizeBody, user } = req.context;
	const payload = validateSchema(ConsumerProfileSchema, sanitizeBody(req.body), next);
	if (!payload) return;
	return handleResponse(req, res, next, ConsumerProfileService.upsertProfile(user.id, payload), "401");
};

/**
 * @swagger
 * /api/v1/main/consumer/profile:
 *   patch:
 *     summary: Update the consumer's profile
 *     description: Same behavior as POST /consumer/profile — both create and update use the same upsert logic.
 *     tags: [Consumer Profile]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ConsumerProfileRequest' }
 *     responses:
 *       200:
 *         description: Consumer profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Consumer profile updated successfully" }
 *                 data: { $ref: '#/components/schemas/ConsumerProfileResponse' }
 *       400: { description: Validation failed, or the username is already taken, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a consumer, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: User not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const updateConsumerProfile: RequestHandler = async (req, res, next) => {
	const { validateSchema, sanitizeBody, user } = req.context;
	const payload = validateSchema(ConsumerProfileSchema, sanitizeBody(req.body), next);
	if (!payload) return;
	return handleResponse(req, res, next, ConsumerProfileService.upsertProfile(user.id, payload), "402");
};

/**
 * @swagger
 * /api/v1/main/consumer/profile:
 *   get:
 *     summary: Get the consumer's profile
 *     tags: [Consumer Profile]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Consumer profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Consumer profile retrieved successfully" }
 *                 data: { $ref: '#/components/schemas/ConsumerProfileResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a consumer, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: User not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getConsumerProfile: RequestHandler = async (req, res, next) => {
	const { user } = req.context;
	return handleResponse(req, res, next, ConsumerProfileService.getProfile(user.id), "403");
};

/**
 * @swagger
 * /api/v1/main/consumer/profile/skip:
 *   post:
 *     summary: Skip the current onboarding step
 *     description: Marks the consumer's current onboarding step (from the sequence username → phone → date of birth → location → profile image) as skipped so it is excluded from future nextStep calculations.
 *     tags: [Consumer Profile]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Consumer profile skipped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Consumer profile skipped successfully" }
 *                 data: { $ref: '#/components/schemas/ConsumerProfileResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a consumer, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: User not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const skipConsumerProfile: RequestHandler = async (req, res, next) => {
	const { user } = req.context;
	return handleResponse(req, res, next, ConsumerProfileService.skipProfile(user.id), "404");
};

/**
 * @swagger
 * /api/v1/main/consumer/profile/image/upload:
 *   post:
 *     summary: Upload the consumer's profile image
 *     description: Stores the file in S3 and saves the returned public URL onto the profile. File type/size errors (multer fileFilter) come back with the same error shape as validation errors.
 *     tags: [Consumer Profile]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary, description: "jpeg, jpg, png, or webp, max 5MB." }
 *     responses:
 *       200:
 *         description: Consumer profile image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Consumer profile image uploaded successfully" }
 *                 data: { $ref: '#/components/schemas/ConsumerProfileImageUploadResponse' }
 *       400: { description: File missing, wrong type, or too large, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a consumer, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const uploadConsumerProfileImage: RequestHandler = async (req, res, next) => {
	const { manageApplicationErrors, errorCode, user } = req.context;
	if (!req.file) {
		return next(
			manageApplicationErrors({
				message: "Profile image file is required",
				statusCode: 400,
				errorCode: errorCode(ERR_USER, "405"),
			})
		);
	}
	return handleResponse(req, res, next, ConsumerProfileService.uploadProfileImage(user.id, req.file), "405");
};
