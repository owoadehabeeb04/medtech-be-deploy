import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload as DefaultJwtPayload } from "jsonwebtoken";
import { FORBIDDEN, UNAUTHORIZED } from "http-status";
import { applicationConfig } from "../config";
import { ERR_USER } from "../constants/error-codes";
import { User } from "../modules/users/User.model";
import { AuthenticatedUser } from "../core/context";

interface JwtPayload extends DefaultJwtPayload {
	id: string;
}

class Authentication {
	static verifyToken() {
		return async (req: Request, res: Response, next: NextFunction) => {
			const { manageApplicationErrors, errorCode } = req.context;

			try {
				const authHeader = req.headers.authorization;

				if (!authHeader || !authHeader.startsWith("Bearer ")) {
					return next(
						manageApplicationErrors({
							message: "Authorization header missing or malformed",
							statusCode: UNAUTHORIZED,
							errorCode: errorCode(ERR_USER, "01A"),
						})
					);
				}

				const token = authHeader.split(" ")[1];

				// Verify and decode token
				const tokenData = jwt.verify(token, applicationConfig.tokenSecret) as JwtPayload;

				//Get user from DB
				const user = await User.findByPk(tokenData.id);

				if (!user) {
					return next(
						manageApplicationErrors({
							message: "User not found",
							statusCode: UNAUTHORIZED,
							errorCode: errorCode(ERR_USER, "02A"),
						})
					);
				}

				
				const plainUser = user.get({ plain: true }) as unknown as Record<string, any>;

				req.context.user = {
					...plainUser,
					permissions: tokenData.permissions || [],
				} as AuthenticatedUser;

				next();
			} catch (err: any) {
				if (err.name === "TokenExpiredError") {
					return next(
						manageApplicationErrors({
							message: "Token expired",
							statusCode: UNAUTHORIZED,
							errorCode: errorCode(ERR_USER, "03A"),
						})
					);
				}

				return next(
					manageApplicationErrors({
						message: "Authentication failed",
						statusCode: UNAUTHORIZED,
						errorCode: errorCode(ERR_USER, "04A"),
					})
				);
			}
		};
	}

}

//module.exports = Authentication;
export default Authentication;
