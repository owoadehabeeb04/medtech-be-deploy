import { Request } from "express";
import { RESPONSE_MESSAGES } from "../../../constants/response";
import { ApiResponse } from "../../../utils/common.dto";
import { User } from "../../users/User.model";
import { UserService } from "../../users/User.service";
import { RequestOtpDTO, SignupDTO } from "../UserAuth.dto";
import { UserAuth } from "../UserAuth.model";
import { UserAuthService } from "../UserAuth.service";
import { AuthStrategy } from "./Auth.strategy";

export class UserAuthStrategy implements AuthStrategy {
	async signup(data: SignupDTO, req?: Request): Promise<ApiResponse> {
		const { firstName, lastName, email, tnc, userType, verificationNumber, password } = data;
		const user = await User.findByEmail(data.email, userType);

		if (user) {
			return {
				status: false,
				code: 400,
				message: RESPONSE_MESSAGES.USER_ALREADY_EXIST,
			};
		}

		const result = await UserService.createUser({
			firstName,
			lastName,
			email,
			tnc,
			userType,
			verificationNumber,
		});

		if (!result) {
			return {
				status: false,
				code: 400,
				message: RESPONSE_MESSAGES.SERVER_ERROR,
			};
		}

		const requestOtpData: RequestOtpDTO = {
			email: email,
			userType,
			path: "/auth/signup",
		};
		const otpResult = await UserAuthService.requestOtp(requestOtpData, req);

		if (!otpResult.status) {
			return {
				status: true,
				code: 400,
				message: RESPONSE_MESSAGES.SERVER_ERROR,
				data: result,
			};
		}

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.USER_REGISTERED,
			data: { ...otpResult.data },
		};
	}

	async setPassword(user: User, password: string): Promise<ApiResponse> {
		const authExist = await UserAuth.findByIdentifier(user.email);

		if (!authExist) {
			return {
				status: false,
				code: 404,
				message: RESPONSE_MESSAGES.USER_NOT_FOUND,
			};
		}

		const hashedPassword = await UserAuth.encryptPassword(password);

		authExist.password = hashedPassword;

		await authExist.save();

		const token = await UserAuthService.generateToken(user);

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.PASSWORD_SET,
			data: {
				user,
				token,
			},
		};
	}

	async login(user: User, password: string): Promise<ApiResponse> {
		const ua = await UserAuth.findById(user.id);

		if (!ua) {
			return {
				status: false,
				code: 400,
				message: RESPONSE_MESSAGES.USER_NOT_FOUND,
			};
		}

		const isValid = await UserAuth.validatePassword(password, ua.password);

		if (!isValid) {
			return {
				status: false,
				code: 401,
				message: RESPONSE_MESSAGES.INVALID_CREDENTIALS,
			};
		}

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data: { user },
		};
	}
}
