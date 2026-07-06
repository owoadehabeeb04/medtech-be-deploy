import { NextFunction, Request, RequestHandler, Response } from "express";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { ERR_USER } from "../../../constants/error-codes";
import {  BulkAssignPermissionSchema } from "../Permission.schema";
import { PermissionService } from "../Permission.service";

/**
 * @swagger
 * /api/v1/main/permissions/bulk-assign:
 *   post:
 *     summary: Bulk assign permissions across multiple user types
 *     description: Runs inside a single database transaction — either every assignment in the list succeeds or none do.
 *     tags: [Permissions]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/BulkAssignPermissionRequest' }
 *     responses:
 *       200:
 *         description: Bulk permissions assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Bulk permissions assigned successfully" }
 *                 data: { $ref: '#/components/schemas/BulkAssignPermissionResponse' }
 *       400: { description: Validation failed, no assignments provided, or invalid permission IDs, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: One or more user types not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const bulkAssignPermission: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, errorCode, encrypt, sequelize } = req.context;

    const cleanBody = sanitizeBody(req.body);

    const payload = validateSchema(BulkAssignPermissionSchema, cleanBody, next);

    if (!payload) return;

    const [error, data] = await manageAsyncOps(PermissionService.bulkAssignPermissions(payload, sequelize));

    if (error) {
        console.log(error);
        return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "137") }));
    }

    if (!data.status)
        return next(manageApplicationErrors({ message: data.message, statusCode: data.code || INTERNAL_SERVER_ERROR, errorCode: data.data?.errorCode || errorCode(ERR_USER, "138") }));

    res.response = {
        message: data.message,
        statusCode: OK,
        data: encrypt(data.data),
    };

    return next();
};
