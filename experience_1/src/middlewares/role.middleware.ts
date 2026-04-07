import { NextFunction, Request, Response } from "express";
import { ERR_USER } from "../constants/error-codes";
import { normalizeAuthRole } from "../utils/auth-role";

export const normalizeRole = normalizeAuthRole;
const FORBIDDEN_STATUS = 403;

export const requireRole = (...roles: string[]) => {
	const normalizedRoles = roles.map((role) => normalizeRole(role)).filter(Boolean);

	return (req: Request, res: Response, next: NextFunction) => {
		const { errorCode, user } = req.context;
		const currentRole = normalizeRole(user?.userType || user?.role);

		if (!currentRole || !normalizedRoles.includes(currentRole)) {
			return res.status(FORBIDDEN_STATUS).json({
				message: "Forbidden: You do not have access to this resource",
				errorCode: errorCode(ERR_USER, "0RC"),
				statusCode: FORBIDDEN_STATUS,
				errors: {},
			});
		}

		return next();
	};
};
