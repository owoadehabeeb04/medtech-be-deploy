import { applicationConfig } from "../../config";
import { RESPONSE_MESSAGES } from "../../constants/response";
import { genAlphaNum, genRandomNumber } from "../../utils";
import { ApiResponse } from "../../utils/common.dto";
import { UserToken } from "../user_token/UserToken.model";
import { CreateOTPDTO } from "../user_verification/UserVerification.dto";
import { UserVerification } from "../user_verification/UserVerification.model";
import { UserVerificationService } from "../user_verification/UserVerification.service";
import { User } from "../users/User.model";
import jwt from "jsonwebtoken";
import { UserAuth } from "./UserAuth.model";
import { LoginDTO, RequestOtpDTO, SignupDTO } from "./UserAuth.dto";
import { AuthContext } from "./strategy/Auth.context";
import { AppEventEmitter } from "../../observers/eventEmitter";
import { EVENT_CONSTANT } from "../../constants/event_type";
import { Request } from "express";

const { isProduction, tokenSecret, tokenExpirationTime } = applicationConfig;

export class UserAuthService {
	static async signup(data: SignupDTO, req: Request): Promise<ApiResponse> {
		const { firstName, lastName, email, tnc, userType, verificationNumber, password } = data;

		const constext = new AuthContext(userType);

		const result = await constext.signup(data, req);

		if (!result) {
			return {
				status: false,
				code: result.code,
				message: result.message || RESPONSE_MESSAGES.SERVER_ERROR,
			};
		}

		return {
			status: true,
			code: 201,
			message: result.message || RESPONSE_MESSAGES.USER_REGISTERED,
			data: { ...result.data },
		};
	}

	static async login(data: LoginDTO): Promise<ApiResponse> {
		const { email, password, userType } = data;

		const user = await User.findByEmail(email, userType);

		if (!user) {
			return {
				status: false,
				code: 404,
				message: RESPONSE_MESSAGES.USER_NOT_FOUND,
			};
		}

		const context = new AuthContext(userType);

		const userContext = await context.login(user, password);

		if (!userContext || !userContext.status) {
			return {
				status: false,
				code: 400,
				message: userContext.message || RESPONSE_MESSAGES.INVALID_CREDENTIALS,
			};
		}

		const token = await this.generateToken(user);
		userContext.data.token = token;

		return {
			status: true,
			message: RESPONSE_MESSAGES.SUCCESSS,
			code: 200,
			data: { ...userContext.data },
		};
	}

	static async requestOtp(data: RequestOtpDTO, req: Request): Promise<ApiResponse> {
		const { email, phoneNumber, userType, path } = data;
		if (!email) {
			return {
				status: false,
				code: 400,
				message: "Email is required",
			};
		}

		const otp = genRandomNumber(4);
		const sessionId = genAlphaNum(12);

		const otpData: CreateOTPDTO = {
			otp,
			sessionId,
			phoneNumber: phoneNumber || "",
			email,
			userType,
			validated: false,
			path,
		};

		await UserVerificationService.setSession(otpData);

		//Send Mail
		const emailData = {
			otpDigits: otp.split(""),
			browserName: req.headers["user-agent"] || "Unknown",
			deviceOS: req.headers["user-agent"] || "Unknown",
			requestDate: new Date().toLocaleDateString(),
			ipAddress: req.ip,
			supportEmail: "support@quickmedic.com",
		};

		AppEventEmitter.emit(EVENT_CONSTANT.OTP_REQUESTED, email, emailData);

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.OTP_SENT,
			data: { sessionId, otp: isProduction ? undefined : otp },
		};
	}

	static async verifyOtp(sessionId: string, otp: string): Promise<ApiResponse> {
		const session = await UserVerification.getSession(sessionId);

		if (!session) {
			return {
				status: false,
				code: 400,
				message: RESPONSE_MESSAGES.OTP_INVALID_OR_EXPIRED,
			};
		}

		const isValid = await UserVerificationService.validateOTP(sessionId, otp);

		if (!isValid) {
			return { status: false, code: 400, message: RESPONSE_MESSAGES.OTP_INVALID_OR_EXPIRED };
		}

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.OTP_VERIFIED,
			data: {
				sessionId,
			},
		};
	}

	static async generateToken(user: User) {
		const userType = user.userTypeData;
		const permissions = userType?.permissions?.map((p) => p.key) || [];

		console.log(permissions)

		const payload = {
			id: user.id,
			userType: user.userType,
			permissions,
		};

		const token = jwt.sign(payload, tokenSecret, { expiresIn: tokenExpirationTime });

		await UserToken.setToken(user.id, token);

		return token;
	}

	static async setPassword(sessionId: string, password: string): Promise<ApiResponse> {
		const sessionData = await UserVerification.getSession(sessionId);

		if (!sessionData || !sessionData.validated) {
			return {
				status: false,
				code: 400,
				message: RESPONSE_MESSAGES.OTP_INVALID_OR_EXPIRED,
			};
		}

		const user = await User.findByEmail(sessionData.email, sessionData.userType);

		if (!user) {
			return {
				status: false,
				code: 404,
				message: RESPONSE_MESSAGES.USER_NOT_FOUND,
			};
		}

		const context = new AuthContext(sessionData.userType);

		const userContext = await context.setPassword(user, password);

		if (!userContext || !userContext.status) {
			return {
				status: false,
				code: userContext.code || 400,
				message: userContext.message || RESPONSE_MESSAGES.SERVER_ERROR,
			};
		}

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.PASSWORD_SET,
			data: { ...userContext.data },
		};
		//delete sessionData
	}

	static async resetPassword(sessionId: string, newPassword: string): Promise<ApiResponse> {
		const session = await UserVerification.getSession(sessionId);

		if (!session || !session.validated) {
			return {
				status: false,
				code: 400,
				message: RESPONSE_MESSAGES.OTP_INVALID_OR_EXPIRED,
			};
		}
		const email = session.email;

		const user = await User.findByEmail(email, session.userType);

		if (!user) {
			return {
				status: false,
				code: 404,
				message: RESPONSE_MESSAGES.USER_NOT_FOUND,
			};
		}

		const ua = await UserAuth.findById(user.id);
		if (!ua) {
			return {
				status: false,
				code: 404,
				message: RESPONSE_MESSAGES.USER_NOT_FOUND,
			};
		}

		const newPasswordHash = await UserAuth.encryptPassword(newPassword);

		ua.password = newPasswordHash;
		await ua.save();

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
		};
	}
}
