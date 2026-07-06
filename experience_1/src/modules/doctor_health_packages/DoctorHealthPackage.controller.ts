import { INTERNAL_SERVER_ERROR } from "http-status";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";
import {
	CreateDoctorHealthPackageSchema,
	DoctorHealthPackageParamsSchema,
	UpdateDoctorHealthPackageSchema,
} from "./DoctorHealthPackage.schema";
import { DoctorHealthPackageService } from "./DoctorHealthPackage.service";

type DoctorHealthPackageFilesMap = Record<string, Express.Multer.File[]>;

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

const getUploadedFiles = (req: Request) => {
	const files = (req.files || {}) as DoctorHealthPackageFilesMap;
	return {
		coverImage: files.coverImage?.[0],
		attachment: files.attachment?.[0],
	};
};

/**
 * @swagger
 * /api/v1/main/doctor/health-packages:
 *   get:
 *     summary: List the doctor's health packages
 *     tags: [Doctor Health Packages]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Doctor health packages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor health packages retrieved successfully" }
 *                 data: { $ref: '#/components/schemas/HealthPackageListResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const listDoctorHealthPackages: RequestHandler = async (req, res, next) =>
	handleResponse(req, res, next, DoctorHealthPackageService.listPackages(req.context.user.id), "621");

/**
 * @swagger
 * /api/v1/main/doctor/health-packages/{packageId}:
 *   get:
 *     summary: Get a health package's details
 *     tags: [Doctor Health Packages]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: packageId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Doctor health package retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor health package retrieved successfully" }
 *                 data: { type: object, properties: { package: { $ref: '#/components/schemas/HealthPackageResponse' } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Doctor health package not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getDoctorHealthPackageDetails: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorHealthPackageParamsSchema, req.params, next);
	if (!payload) return;

	return handleResponse(
		req,
		res,
		next,
		DoctorHealthPackageService.getPackageDetails(req.context.user.id, Number(payload.packageId)),
		"622"
	);
};

/**
 * @swagger
 * /api/v1/main/doctor/health-packages:
 *   post:
 *     summary: Create a health package
 *     description: coverImage and attachment are optional file fields alongside the text fields. File-type errors (multer fileFilter) share the same error shape as validation errors.
 *     tags: [Doctor Health Packages]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema: { $ref: '#/components/schemas/HealthPackageCreateRequest' }
 *     responses:
 *       201:
 *         description: Doctor health package created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor health package created successfully" }
 *                 data: { type: object, properties: { package: { $ref: '#/components/schemas/HealthPackageResponse' } } }
 *       400: { description: Validation failed, or file type/size rejected, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const createDoctorHealthPackage: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(CreateDoctorHealthPackageSchema, req.body, next);
	if (!payload) return;

	return handleResponse(
		req,
		res,
		next,
		DoctorHealthPackageService.createPackage(req.context.user.id, payload, getUploadedFiles(req)),
		"623"
	);
};

/**
 * @swagger
 * /api/v1/main/doctor/health-packages/{packageId}:
 *   patch:
 *     summary: Update a health package
 *     description: All fields optional, but at least one field or file must be supplied.
 *     tags: [Doctor Health Packages]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: packageId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema: { $ref: '#/components/schemas/HealthPackageUpdateRequest' }
 *     responses:
 *       200:
 *         description: Doctor health package updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Doctor health package updated successfully" }
 *                 data: { type: object, properties: { package: { $ref: '#/components/schemas/HealthPackageResponse' } } }
 *       400: { description: Validation failed, no field/file supplied, or file type/size rejected, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Doctor health package not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const updateDoctorHealthPackage: RequestHandler = async (req, res, next) => {
	const params = req.context.validateSchema(DoctorHealthPackageParamsSchema, req.params, next);
	if (!params) return;

	const payload = req.context.validateSchema(UpdateDoctorHealthPackageSchema, req.body, next);
	if (!payload && Object.keys(req.body || {}).length > 0) return;

	const uploadedFiles = getUploadedFiles(req);
	const hasPayloadFields = Boolean(payload && Object.keys(payload).length > 0);
	if (!hasPayloadFields && !uploadedFiles.coverImage && !uploadedFiles.attachment) {
		const { manageApplicationErrors, errorCode } = req.context;
		return next(
			manageApplicationErrors({
				message: "At least one field or file update is required",
				statusCode: 400,
				errorCode: errorCode(ERR_USER, "624A"),
			})
		);
	}

	return handleResponse(
		req,
		res,
		next,
		DoctorHealthPackageService.updatePackage(req.context.user.id, Number(params.packageId), payload || {}, uploadedFiles),
		"624"
	);
};

/**
 * @swagger
 * /api/v1/main/doctor/health-packages/{packageId}:
 *   delete:
 *     summary: Delete a health package
 *     description: Soft delete.
 *     tags: [Doctor Health Packages]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: packageId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Doctor health package deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { message: { type: string, example: "Doctor health package deleted successfully" } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Doctor health package not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const deleteDoctorHealthPackage: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(DoctorHealthPackageParamsSchema, req.params, next);
	if (!payload) return;

	return handleResponse(
		req,
		res,
		next,
		DoctorHealthPackageService.deletePackage(req.context.user.id, Number(payload.packageId)),
		"625"
	);
};
