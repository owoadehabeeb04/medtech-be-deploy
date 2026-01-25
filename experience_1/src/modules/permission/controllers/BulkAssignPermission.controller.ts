import { NextFunction, Request, RequestHandler, Response } from "express";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { ERR_USER } from "../../../constants/error-codes";
import {  BulkAssignPermissionSchema } from "../Permission.schema";
import { PermissionService } from "../Permission.service";

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
