import { NextFunction, Request, RequestHandler, Response } from "express";
import { CommonUserTypeSchema, CreateUserTypeSchema, UpdateUserTypeSchema } from "./UserTypes.schema";
import { UserTypeService } from "./UserType.service";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { ERR_USER } from "../../constants/error-codes";

/**
 * @swagger
 * /api/v1/main/user-types/create:
 *   post:
 *     summary: Create a new user type
 *     description: Creates a role/user-type record (e.g. "doctor", "consumer") with an optional set of permission IDs pre-assigned. `key` must be unique.
 *     tags: [User Types]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UserTypeRequest' }
 *     responses:
 *       200:
 *         description: User type created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "User type created successfully." }
 *                 data: { $ref: '#/components/schemas/UserTypeResponse' }
 *       400: { description: Validation failed, or a user type with this key already exists, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const createUserType: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt } = req.context;

	const cleanBody = sanitizeBody(req.body, ["name","key"]);

	const payload = validateSchema(CreateUserTypeSchema, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(UserTypeService.createUserType(payload));

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "300") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "301") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};

/**
 * @swagger
 * /api/v1/main/user-types/all:
 *   get:
 *     summary: List all user types
 *     description: Returns every user type ordered by name, each including its assigned permissions.
 *     tags: [User Types]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "User types retrieved successfully" }
 *                 data: { type: array, items: { $ref: '#/components/schemas/UserTypeResponse' } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getAllUserTypes: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt } = req.context;

	const [error, data] = await manageAsyncOps(UserTypeService.getAllUserTypes());

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "302") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "303") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};

/**
 * @swagger
 * /api/v1/main/user-types/id/{userTypeId}:
 *   get:
 *     summary: Get a user type by ID
 *     tags: [User Types]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: userTypeId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *         description: Numeric ID of the user type.
 *     responses:
 *       200:
 *         description: User type retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "User type retrieved successfully" }
 *                 data: { $ref: '#/components/schemas/UserTypeResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: User type not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getUserTypeById: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt } = req.context;

	const cleanBody = sanitizeBody(req.params);

	const payload = validateSchema(CommonUserTypeSchema, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(UserTypeService.getUserTypeById(payload.userTypeId));

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "304") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "305") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};

/**
 * @swagger
 * /api/v1/main/user-types/update:
 *   post:
 *     summary: Update a user type
 *     description: Full-replace update — name and key are required even though this reads like a partial update. userTypeId identifies the record to update and is part of the body, not the URL.
 *     tags: [User Types]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UserTypeUpdateRequest' }
 *     responses:
 *       200:
 *         description: User type updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "User type updated successfully" }
 *                 data: { $ref: '#/components/schemas/UserTypeResponse' }
 *       400: { description: Validation failed, or the new key is already in use by another user type, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: User type not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const updateUserType: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt } = req.context;

	const cleanBody = sanitizeBody(req.body);

	const payload = validateSchema(UpdateUserTypeSchema, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(UserTypeService.updateUserType(payload.userTypeId, payload));

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "306") }));
	}

	if (!data.status)
		return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "307") }));

	res.response = {
		message: data.message,
		statusCode: OK,
		data: encrypt(data.data),
	};

	return next();
};

/**
 * @swagger
 * /api/v1/main/user-types/delete/{userTypeId}:
 *   delete:
 *     summary: Delete a user type
 *     description: Fails if the user type is still assigned to any user.
 *     tags: [User Types]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: userTypeId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *         description: Numeric ID of the user type.
 *     responses:
 *       200:
 *         description: User type deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { message: { type: string, example: "User type deleted successfully" } }
 *       400: { description: Cannot delete a user type that is assigned to users, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: User type not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const deleteUserType: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt } = req.context;

	const cleanBody = sanitizeBody(req.params);

	const payload = validateSchema(CommonUserTypeSchema, cleanBody, next);

	if (!payload) return;

	const [error, data] = await manageAsyncOps(UserTypeService.deleteUserType(payload.userTypeId));

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
