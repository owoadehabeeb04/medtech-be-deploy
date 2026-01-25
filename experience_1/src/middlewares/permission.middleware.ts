import { Request, Response, NextFunction } from "express";
import { FORBIDDEN } from "http-status";
import { ERR_USER } from "../constants/error-codes";

export default class PermissionMiddleware {
	/**
	 * Require exactly one permission
	 */
	static hasPermission(requiredPermission: string) {
		return (req: Request, res: Response, next: NextFunction) => {
			const { manageApplicationErrors, errorCode, user } = req.context;

			if (!user || !user.permissions) {
				return next(
					manageApplicationErrors({
						message: "Unauthorized: No permissions found",
						statusCode: FORBIDDEN,
						errorCode: errorCode(ERR_USER, "0PA"),
					})
				);
			}

			if (!user.permissions.includes(requiredPermission)) {
				return next(
					manageApplicationErrors({
						message: "Forbidden: You lack required permission",
						statusCode: FORBIDDEN,
						errorCode: errorCode(ERR_USER, "0PB"),
					})
				);
			}

			next();
		};
	}

	/**
	 * Requires at least one of the listed permissions
	 */
	static hasAnyPermission(...permissions: string[]) {
		return (req: Request, res: Response, next: NextFunction) => {
			const { manageApplicationErrors, errorCode, user } = req.context;

			if (!user || !user.permissions) {
				return next(
					manageApplicationErrors({
						message: "Unauthorized: No permissions found",
						statusCode: FORBIDDEN,
						errorCode: errorCode(ERR_USER, "0PA"),
					})
				);
			}

			const hasAtLeastOne = permissions.some((p) => user.permissions.includes(p));

			if (!hasAtLeastOne) {
				return next(
					manageApplicationErrors({
						message: "Forbidden: You lack required permission",
						statusCode: FORBIDDEN,
						errorCode: errorCode(ERR_USER, "0PB"),
					})
				);
			}

			next();
		};
	}
}
