import { INTERNAL_SERVER_ERROR } from "http-status";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";
import {
	DoctorAccountSchema,
	DoctorAddressSchema,
	DoctorBasicProfileSchema,
	DoctorEducationSchema,
	DoctorSpecialtiesSchema,
	DoctorWorkHistorySchema,
} from "./DoctorProfile.schema";
import { DoctorProfileService } from "./DoctorProfile.service";

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
 * /api/v1/main/doctor/profile:
 *   get:
 *     summary: Get the raw doctor profile aggregate
 *     description: Returns the same aggregate shape (profile, education, work history, specialties, onboarding status) used by every mutation endpoint in this module.
 *     tags: [Doctor Profile]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Doctor profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor profile retrieved successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorProfileAggregateResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: User not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getDoctorProfile: RequestHandler = async (req, res, next) => {
	return handleResponse(req, res, next, DoctorProfileService.getProfile(req.context.user.id), "501");
};

/**
 * @swagger
 * /api/v1/main/doctor/profile/me:
 *   get:
 *     summary: Get a richer account-info view of the doctor profile
 *     description: Unlike GET /doctor/profile, this groups fields into accountInformation, contactAddress, and specialtyInformation sections intended for an account/settings screen.
 *     tags: [Doctor Profile]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Doctor profile information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor profile information retrieved successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorProfileMeResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: User or doctor profile not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getDoctorProfileMe: RequestHandler = async (req, res, next) => {
	return handleResponse(req, res, next, DoctorProfileService.getProfileMe(req.context.user.id), "501A");
};

/**
 * @swagger
 * /api/v1/main/doctor/profile/account:
 *   patch:
 *     summary: Update account info (name/phone only)
 *     description: At least one field required. Email cannot be changed from this endpoint — it is rejected if present in the body.
 *     tags: [Doctor Profile]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DoctorAccountRequest' }
 *     responses:
 *       200:
 *         description: Doctor account information updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor account information updated successfully" }
 *                 data: { type: object, properties: { accountInformation: { type: object }, profileStatus: { $ref: '#/components/schemas/ProfileStatus' } } }
 *       400: { description: Validation failed, or the new phone number is already registered, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: User or doctor profile not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const updateDoctorAccount: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorAccountSchema, req.body, next);
	if (!payload) return;
	return handleResponse(req, res, next, DoctorProfileService.updateAccount(req.context.user.id, payload), "501B");
};

/**
 * @swagger
 * /api/v1/main/doctor/profile/basic:
 *   post:
 *     summary: Create the doctor's basic profile
 *     description: At least one field required. This is an upsert — the same handler backs both POST and PATCH.
 *     tags: [Doctor Profile]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DoctorBasicProfileRequest' }
 *     responses:
 *       200:
 *         description: Doctor basic profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor basic profile updated successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorProfileAggregateResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const createDoctorBasicProfile: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorBasicProfileSchema, req.body, next);
	if (!payload) return;
	return handleResponse(req, res, next, DoctorProfileService.upsertBasic(req.context.user.id, payload), "502");
};

/**
 * @swagger
 * /api/v1/main/doctor/profile/basic:
 *   patch:
 *     summary: Update the doctor's basic profile
 *     description: Same upsert behavior as POST /doctor/profile/basic.
 *     tags: [Doctor Profile]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DoctorBasicProfileRequest' }
 *     responses:
 *       200:
 *         description: Doctor basic profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor basic profile updated successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorProfileAggregateResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const updateDoctorBasicProfile: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorBasicProfileSchema, req.body, next);
	if (!payload) return;
	return handleResponse(req, res, next, DoctorProfileService.upsertBasic(req.context.user.id, payload), "503");
};

/**
 * @swagger
 * /api/v1/main/doctor/profile/image:
 *   post:
 *     summary: Upload the doctor's profile image
 *     description: Stores the file in S3 and saves the returned public URL onto the profile.
 *     tags: [Doctor Profile]
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
 *         description: Doctor profile image updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor profile image updated successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorProfileAggregateResponse' }
 *       400: { description: File missing, wrong type, or too large, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const updateDoctorImage: RequestHandler = async (req, res, next) => {
	const { manageApplicationErrors, errorCode } = req.context;
	if (!req.file) {
		return next(
			manageApplicationErrors({
				message: "Profile image file is required",
				statusCode: 400,
				errorCode: errorCode(ERR_USER, "504"),
			})
		);
	}
	return handleResponse(req, res, next, DoctorProfileService.updateImage(req.context.user.id, req.file), "504");
};

/**
 * @swagger
 * /api/v1/main/doctor/profile/address:
 *   post:
 *     summary: Create the doctor's address
 *     description: Upsert — the same handler backs both POST and PATCH.
 *     tags: [Doctor Profile]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DoctorAddressRequest' }
 *     responses:
 *       200:
 *         description: Doctor address updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor address updated successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorProfileAggregateResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Doctor profile not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   patch:
 *     summary: Update the doctor's address
 *     description: Same upsert behavior as POST /doctor/profile/address.
 *     tags: [Doctor Profile]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DoctorAddressRequest' }
 *     responses:
 *       200:
 *         description: Doctor address updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor address updated successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorProfileAggregateResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Doctor profile not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const updateDoctorAddress: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorAddressSchema, req.body, next);
	if (!payload) return;
	return handleResponse(req, res, next, DoctorProfileService.updateAddress(req.context.user.id, payload), "505");
};

/**
 * @swagger
 * /api/v1/main/doctor/profile/education:
 *   get:
 *     summary: List the doctor's education history
 *     tags: [Doctor Profile]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Doctor education history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor education history retrieved successfully" }
 *                 data: { type: object, properties: { educationHistory: { type: array, items: { type: object } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const listDoctorEducationHistory: RequestHandler = async (req, res, next) => {
	return handleResponse(req, res, next, DoctorProfileService.listEducationHistory(req.context.user.id), "505A");
};

/**
 * @swagger
 * /api/v1/main/doctor/profile/education:
 *   post:
 *     summary: Add an education history entry
 *     tags: [Doctor Profile]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DoctorEducationRequest' }
 *     responses:
 *       200:
 *         description: Doctor education history added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor education history added successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorProfileAggregateResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const createDoctorEducation: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorEducationSchema, req.body, next);
	if (!payload) return;
	return handleResponse(req, res, next, DoctorProfileService.createEducation(req.context.user.id, payload), "506");
};

/**
 * @swagger
 * /api/v1/main/doctor/profile/education/{educationId}:
 *   patch:
 *     summary: Update an education history entry
 *     tags: [Doctor Profile]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: educationId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DoctorEducationRequest' }
 *     responses:
 *       200:
 *         description: Doctor education history updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor education history updated successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorProfileAggregateResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Education record not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const updateDoctorEducation: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorEducationSchema, req.body, next);
	if (!payload) return;
	return handleResponse(
		req,
		res,
		next,
		DoctorProfileService.updateEducation(req.context.user.id, Number(req.params.educationId), payload),
		"507"
	);
};

/**
 * @swagger
 * /api/v1/main/doctor/profile/education/{educationId}:
 *   delete:
 *     summary: Delete an education history entry
 *     tags: [Doctor Profile]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: educationId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Doctor education history deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor education history deleted successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorProfileAggregateResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Education record not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const deleteDoctorEducation: RequestHandler = async (req, res, next) => {
	return handleResponse(
		req,
		res,
		next,
		DoctorProfileService.deleteEducation(req.context.user.id, Number(req.params.educationId)),
		"508"
	);
};

/**
 * @swagger
 * /api/v1/main/doctor/profile/work-history:
 *   get:
 *     summary: List the doctor's work history
 *     tags: [Doctor Profile]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Doctor work history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor work history retrieved successfully" }
 *                 data: { type: object, properties: { workHistory: { type: array, items: { type: object } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const listDoctorWorkHistory: RequestHandler = async (req, res, next) => {
	return handleResponse(req, res, next, DoctorProfileService.listWorkHistory(req.context.user.id), "508A");
};

/**
 * @swagger
 * /api/v1/main/doctor/profile/work-history:
 *   post:
 *     summary: Add a work history entry
 *     tags: [Doctor Profile]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DoctorWorkHistoryRequest' }
 *     responses:
 *       200:
 *         description: Doctor work history added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor work history added successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorProfileAggregateResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const createDoctorWorkHistory: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorWorkHistorySchema, req.body, next);
	if (!payload) return;
	return handleResponse(req, res, next, DoctorProfileService.createWorkHistory(req.context.user.id, payload), "509");
};

/**
 * @swagger
 * /api/v1/main/doctor/profile/work-history/{workId}:
 *   patch:
 *     summary: Update a work history entry
 *     tags: [Doctor Profile]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: workId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DoctorWorkHistoryRequest' }
 *     responses:
 *       200:
 *         description: Doctor work history updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor work history updated successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorProfileAggregateResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Work history record not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const updateDoctorWorkHistory: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorWorkHistorySchema, req.body, next);
	if (!payload) return;
	return handleResponse(
		req,
		res,
		next,
		DoctorProfileService.updateWorkHistory(req.context.user.id, Number(req.params.workId), payload),
		"510"
	);
};

/**
 * @swagger
 * /api/v1/main/doctor/profile/work-history/{workId}:
 *   delete:
 *     summary: Delete a work history entry
 *     tags: [Doctor Profile]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: workId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Doctor work history deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor work history deleted successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorProfileAggregateResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Work history record not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const deleteDoctorWorkHistory: RequestHandler = async (req, res, next) => {
	return handleResponse(
		req,
		res,
		next,
		DoctorProfileService.deleteWorkHistory(req.context.user.id, Number(req.params.workId)),
		"511"
	);
};

/**
 * @swagger
 * /api/v1/main/doctor/profile/specialties:
 *   post:
 *     summary: Set the doctor's specialties
 *     description: Replaces the doctor's entire specialty set. Exactly one of specialityIds/specialtyIds must be supplied. All submitted speciality IDs must be active.
 *     tags: [Doctor Profile]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DoctorSpecialtiesRequest' }
 *     responses:
 *       200:
 *         description: Doctor specialties updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor specialties updated successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorProfileAggregateResponse' }
 *       400: { description: Validation failed, or one or more specialties are invalid, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Doctor profile not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const createDoctorSpecialties: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorSpecialtiesSchema, req.body, next);
	if (!payload) return;
	return handleResponse(req, res, next, DoctorProfileService.replaceSpecialties(req.context.user.id, payload), "512");
};

/**
 * @swagger
 * /api/v1/main/doctor/profile/specialties:
 *   patch:
 *     summary: Update the doctor's specialties
 *     description: Same replace behavior as POST /doctor/profile/specialties.
 *     tags: [Doctor Profile]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DoctorSpecialtiesRequest' }
 *     responses:
 *       200:
 *         description: Doctor specialties updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor specialties updated successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorProfileAggregateResponse' }
 *       400: { description: Validation failed, or one or more specialties are invalid, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Doctor profile not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const updateDoctorSpecialties: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorSpecialtiesSchema, req.body, next);
	if (!payload) return;
	return handleResponse(req, res, next, DoctorProfileService.replaceSpecialties(req.context.user.id, payload), "513");
};

/**
 * @swagger
 * /api/v1/main/doctor/profile/complete-onboarding:
 *   post:
 *     summary: Complete doctor onboarding
 *     description: Performs a final validation of all required steps (profile image, address, education, work history, specialties) rather than blindly flipping a flag.
 *     tags: [Doctor Profile]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Doctor onboarding completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor onboarding completed successfully" }
 *                 data: { $ref: '#/components/schemas/DoctorProfileAggregateResponse' }
 *       400: { description: "Doctor onboarding is incomplete. Next step: <step>", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const completeDoctorOnboarding: RequestHandler = async (req, res, next) => {
	return handleResponse(req, res, next, DoctorProfileService.completeOnboarding(req.context.user.id), "514");
};
