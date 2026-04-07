import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../../constants/error-codes";
import {
	ChangePasswordSchema,
	DoctorRegisterSchema,
	CompleteSignupSchema,
	ForgotPasswordRequestOtpSchema,
	LoginSchema,
	LogoutSchema,
	RefreshTokenSchema,
	ResendOtpSchema,
	ResetPasswordSchema,
	SignupRequestOtpSchema,
	VerifyOtpSchema,
} from "../UserAuth.schema";
import { UserAuthService } from "../UserAuth.service";
import { OTP_PURPOSE } from "../../../constants/constant";

const handleAuthResponse = async (
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
				errorCode: data.data?.errorCode || errorCode(ERR_USER, errorSuffix),
			})
		);
	}

	res.response = {
		message: data.message,
		statusCode: data.code || OK,
		data: encrypt(data.data),
	};

	return next();
};

export const requestSignupOtp: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(SignupRequestOtpSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.requestSignupOtp(payload, req), "301");
};

export const registerDoctor: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(DoctorRegisterSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.registerDoctor(payload), "301A");
};

export const verifySignupOtp: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(VerifyOtpSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.verifyOtp(payload, OTP_PURPOSE.EMAIL_VERIFICATION), "302");
};

export const resendSignupOtp: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(ResendOtpSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.resendOtp(payload.sessionId, OTP_PURPOSE.EMAIL_VERIFICATION, req), "311");
};

export const completeSignup: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(CompleteSignupSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.completeSignup(payload), "303");
};

export const login: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(LoginSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.login(payload), "304");
};

export const refreshToken: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(RefreshTokenSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.refreshToken(payload), "305");
};

export const requestForgotPasswordOtp: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(ForgotPasswordRequestOtpSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.requestForgotPasswordOtp(payload, req), "306");
};

export const verifyForgotPasswordOtp: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(VerifyOtpSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.verifyOtp(payload, OTP_PURPOSE.PASSWORD_RESET), "307");
};

export const resendForgotPasswordOtp: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(ResendOtpSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.resendOtp(payload.sessionId, OTP_PURPOSE.PASSWORD_RESET, req), "312");
};

export const resetPassword: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(ResetPasswordSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.resetPassword(payload), "308");
};

export const logout: RequestHandler = async (req, res, next) => {
	const { validateSchema, user } = req.context;
	const payload = validateSchema(LogoutSchema, req.body, next);
	if (!payload) return;
	const accessToken = req.headers.authorization?.startsWith("Bearer ")
		? req.headers.authorization.split(" ")[1]
		: undefined;
	return handleAuthResponse(req, res, next, UserAuthService.logout(user.id, accessToken, payload.refreshToken), "309");
};

export const me: RequestHandler = async (req, res, next) => {
	const { user } = req.context;
	return handleAuthResponse(req, res, next, UserAuthService.me(user.id), "310");
};

export const changePassword: RequestHandler = async (req, res, next) => {
	const { validateSchema, user } = req.context;
	const payload = validateSchema(ChangePasswordSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.changePassword(user.id, payload), "313");
};
