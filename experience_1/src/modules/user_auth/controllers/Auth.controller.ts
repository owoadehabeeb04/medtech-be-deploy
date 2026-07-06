import { INTERNAL_SERVER_ERROR, OK } from "http-status";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../../constants/error-codes";
import {
	ChangePasswordSchema,
	RegisterSchema,
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

/**
 * @swagger
 * /api/v1/main/auth/signup/request-otp:
 *   post:
 *     summary: Start consumer signup with an OTP
 *     description: Consumer-only — doctors must use POST /auth/signup/register instead. Sends a 4-6 digit OTP to the given email and returns a sessionId used by the verify/resend/complete steps.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SignupRequestOtpRequest' }
 *     responses:
 *       200:
 *         description: OTP has been sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "OTP has been sent successfully." }
 *                 data: { $ref: '#/components/schemas/OtpSessionResponse' }
 *       400: { description: Validation failed, doctor role rejected, or an account already exists for this email/phone, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       500: { description: OTP email delivery failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const requestSignupOtp: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(SignupRequestOtpSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.requestSignupOtp(payload, req), "301");
};

/**
 * @swagger
 * /api/v1/main/auth/signup/register:
 *   post:
 *     summary: Register directly (required for doctors, also usable by consumers)
 *     description: Single-step registration with no OTP round-trip — the only way for role=medic/doctor to sign up. medicalLicenseNumber becomes required in that case. Also accepted for role=customer/consumer as an alternative to the OTP-based flow.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RegisterRequest' }
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Your account has been created successfully." }
 *                 data: { $ref: '#/components/schemas/AuthResponse' }
 *       400: { description: Validation failed, or an account already exists for this email/phone, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const register: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(RegisterSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.register(payload), "301A");
};

/**
 * @swagger
 * /api/v1/main/auth/signup/verify-otp:
 *   post:
 *     summary: Verify the signup OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/VerifyOtpRequest' }
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "OTP verified successfully." }
 *                 data: { $ref: '#/components/schemas/OtpVerifiedResponse' }
 *       400: { description: Session not found, wrong purpose, expired, already used, superseded, or the OTP itself is invalid/expired, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const verifySignupOtp: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(VerifyOtpSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.verifyOtp(payload, OTP_PURPOSE.EMAIL_VERIFICATION), "302");
};

/**
 * @swagger
 * /api/v1/main/auth/signup/resend-otp:
 *   post:
 *     summary: Resend the signup OTP
 *     description: Deactivates the previous OTP for this session before issuing a new one.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ResendOtpRequest' }
 *     responses:
 *       200:
 *         description: OTP has been sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "OTP has been sent successfully." }
 *                 data: { $ref: '#/components/schemas/OtpSessionResponse' }
 *       400: { description: Session not found, wrong purpose, expired, already used, or superseded, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       500: { description: OTP email delivery failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const resendSignupOtp: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(ResendOtpSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.resendOtp(payload.sessionId, OTP_PURPOSE.EMAIL_VERIFICATION, req), "311");
};

/**
 * @swagger
 * /api/v1/main/auth/signup/complete:
 *   post:
 *     summary: Complete consumer signup
 *     description: Final step of the OTP-based consumer signup flow — sessionId must belong to an already-verified OTP session. Payload carries firstName/lastName/phoneNumber/email plus the password; email must match the address the OTP session verified (mismatches are rejected with 400).
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CompleteSignupRequest' }
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Your account has been created successfully." }
 *                 data: { $ref: '#/components/schemas/AuthResponse' }
 *       400: { description: Session not verified/expired/not found, passwords do not match, submitted email doesn't match the verified session email, or an account already exists, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const completeSignup: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(CompleteSignupSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.completeSignup(payload), "303");
};

/**
 * @swagger
 * /api/v1/main/auth/login:
 *   post:
 *     summary: Log in
 *     description: role must match the account's stored role (after customer→consumer / medic→doctor normalization) or the request fails with 401.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginRequest' }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Login successful." }
 *                 data: { $ref: '#/components/schemas/AuthResponse' }
 *       401: { description: Invalid email/password, or role does not match the account, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Account is inactive, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: No account found for this email, or no auth record found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const login: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(LoginSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.login(payload), "304");
};

/**
 * @swagger
 * /api/v1/main/auth/refresh-token:
 *   post:
 *     summary: Refresh the access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RefreshTokenRequest' }
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Token refreshed successfully." }
 *                 data: { $ref: '#/components/schemas/AuthResponse' }
 *       401: { description: Invalid, expired, or mismatched refresh token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: User not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const refreshToken: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(RefreshTokenSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.refreshToken(payload), "305");
};

/**
 * @swagger
 * /api/v1/main/auth/forgot-password/request-otp:
 *   post:
 *     summary: Start the forgot-password flow
 *     description: Always responds 200 whether or not the email exists, so account existence cannot be enumerated from this endpoint.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ForgotPasswordRequestOtpRequest' }
 *     responses:
 *       200:
 *         description: OTP has been sent successfully (or silently no-ops if the email doesn't exist)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "OTP has been sent successfully." }
 *                 data: { $ref: '#/components/schemas/OtpSessionResponse' }
 *       500: { description: OTP email delivery failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const requestForgotPasswordOtp: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(ForgotPasswordRequestOtpSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.requestForgotPasswordOtp(payload, req), "306");
};

/**
 * @swagger
 * /api/v1/main/auth/forgot-password/verify-otp:
 *   post:
 *     summary: Verify the forgot-password OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/VerifyOtpRequest' }
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "OTP verified successfully." }
 *                 data: { $ref: '#/components/schemas/OtpVerifiedResponse' }
 *       400: { description: Session not found, wrong purpose, expired, already used, superseded, or the OTP itself is invalid/expired, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const verifyForgotPasswordOtp: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(VerifyOtpSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.verifyOtp(payload, OTP_PURPOSE.PASSWORD_RESET), "307");
};

/**
 * @swagger
 * /api/v1/main/auth/forgot-password/resend-otp:
 *   post:
 *     summary: Resend the forgot-password OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ResendOtpRequest' }
 *     responses:
 *       200:
 *         description: OTP has been sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "OTP has been sent successfully." }
 *                 data: { $ref: '#/components/schemas/OtpSessionResponse' }
 *       400: { description: Session not found, wrong purpose, expired, already used, or superseded, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       500: { description: OTP email delivery failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const resendForgotPasswordOtp: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(ResendOtpSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.resendOtp(payload.sessionId, OTP_PURPOSE.PASSWORD_RESET, req), "312");
};

/**
 * @swagger
 * /api/v1/main/auth/reset-password:
 *   post:
 *     summary: Reset the account password
 *     description: Requires a sessionId whose OTP has already been verified via /auth/forgot-password/verify-otp. Revokes all existing sessions for the user, forcing re-login everywhere.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ResetPasswordRequest' }
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { message: { type: string, example: "Password reset successful." } }
 *       400: { description: Session not verified/expired/not found, or passwords do not match, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: User or auth record not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const resetPassword: RequestHandler = async (req, res, next) => {
	const { validateSchema } = req.context;
	const payload = validateSchema(ResetPasswordSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.resetPassword(payload), "308");
};

/**
 * @swagger
 * /api/v1/main/auth/logout:
 *   post:
 *     summary: Log out
 *     description: Body is optional. If refreshToken is omitted, only the current access token's session is revoked.
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LogoutRequest' }
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { message: { type: string, example: "Logout successful." } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const logout: RequestHandler = async (req, res, next) => {
	const { validateSchema, user } = req.context;
	const payload = validateSchema(LogoutSchema, req.body, next);
	if (!payload) return;
	const accessToken = req.headers.authorization?.startsWith("Bearer ")
		? req.headers.authorization.split(" ")[1]
		: undefined;
	return handleAuthResponse(req, res, next, UserAuthService.logout(user.id, accessToken, payload.refreshToken), "309");
};

/**
 * @swagger
 * /api/v1/main/auth/me:
 *   get:
 *     summary: Get the current authenticated user
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success." }
 *                 data: { $ref: '#/components/schemas/UserMeResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const me: RequestHandler = async (req, res, next) => {
	const { user } = req.context;
	return handleAuthResponse(req, res, next, UserAuthService.me(user.id), "310");
};

/**
 * @swagger
 * /api/v1/main/auth/change-password:
 *   post:
 *     summary: Change password (doctor only)
 *     description: Restricted to the doctor role — consumers get 403. newPassword must differ from oldPassword.
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ChangePasswordRequest' }
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Password changed successfully" }
 *                 data: { $ref: '#/components/schemas/AuthResponse' }
 *       400: { description: Old password incorrect, or new password matches the old one, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller is not a doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: User or auth record not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const changePassword: RequestHandler = async (req, res, next) => {
	const { validateSchema, user } = req.context;
	const payload = validateSchema(ChangePasswordSchema, req.body, next);
	if (!payload) return;
	return handleAuthResponse(req, res, next, UserAuthService.changePassword(user.id, payload), "313");
};
