import jwt from "jsonwebtoken";
import { Request } from "express";
import { Op } from "sequelize";
import { applicationConfig } from "../../config";
import { AUTH_ROLE, OTP_PURPOSE, USER_STATUS } from "../../constants/constant";
import { RESPONSE_MESSAGES } from "../../constants/response";
import { UserVerification } from "../user_verification/UserVerification.model";
import { UserVerificationService } from "../user_verification/UserVerification.service";
import { User } from "../users/User.model";
import { UserAuth } from "./UserAuth.model";
import { UserToken } from "../user_token/UserToken.model";
import { UserType } from "../user_types/UserType.model";
import { UserProfile } from "../user_profile/UserProfile.model";
import { DoctorProfile } from "../doctor_profile/DoctorProfile.model";
import { EducationalHistory } from "../educational_history/EducationalHistory.model";
import { WorkHistory } from "../work_history/WorkHistory.model";
import { UserSpeciality } from "../user_specialities/UserSpecialities.model";
import { ApiResponse } from "../../utils/common.dto";
import {
	ChangePasswordDTO,
	CompleteSignupDTO,
	DoctorRegisterDTO,
	ForgotPasswordRequestOtpDTO,
	LoginDTO,
	RequestOtpDTO,
	RefreshTokenDTO,
	ResetPasswordDTO,
	SignupDTO,
	SignupRequestOtpDTO,
	VerifyOtpDTO,
} from "./UserAuth.dto";
import { genAlphaNum, genRandomNumber } from "../../utils";
import { EmailService } from "../../service/Email/Email.service";
import { requireNormalizedAuthRole } from "../../utils/auth-role";
import { buildConsumerProfileStatus, serializeConsumerProfile } from "../consumer_profile/ConsumerProfile.util";

const { isProduction, tokenSecret, refreshTokenSecret, tokenExpirationTime, refreshTokenExpirationTime } = applicationConfig;

type AuthPayload = {
	id: number;
	role: string;
	permissions: string[];
	sessionId: string;
};

export class UserAuthService {
	private static async getOtpSessionError(
		sessionId: string,
		purpose: OTP_PURPOSE,
		options?: { requireValidated?: boolean }
	): Promise<ApiResponse | null> {
		const session = await UserVerificationService.findBySessionId(sessionId);
		if (!session) {
			return { status: false, code: 400, message: RESPONSE_MESSAGES.SESSION_NOT_FOUND };
		}

		if (session.purpose !== purpose) {
			return { status: false, code: 400, message: RESPONSE_MESSAGES.SESSION_WRONG_PURPOSE };
		}

		if (session.expiresAt.getTime() < Date.now()) {
			if (session.isActive) {
				session.isActive = false;
				await session.save();
			}
			return { status: false, code: 400, message: RESPONSE_MESSAGES.SESSION_EXPIRED };
		}

		if (options?.requireValidated) {
			if (!session.validated) {
				return { status: false, code: 400, message: RESPONSE_MESSAGES.SESSION_NOT_VERIFIED };
			}
		} else if (session.validated) {
			return { status: false, code: 400, message: RESPONSE_MESSAGES.SESSION_ALREADY_USED };
		}

		if (!session.isActive) {
			return {
				status: false,
				code: 400,
				message: session.validated ? RESPONSE_MESSAGES.SESSION_ALREADY_USED : RESPONSE_MESSAGES.SESSION_SUPERSEDED,
			};
		}

		return null;
	}

	private static normalizeRole(role: string): string {
		return requireNormalizedAuthRole(role);
	}

	private static getExistingAccountMessage(): string {
		return RESPONSE_MESSAGES.ACCOUNT_ALREADY_EXISTS_LOGIN;
	}

	private static async ensureUserType(role: string): Promise<void> {
		const normalized = this.normalizeRole(role);
		await UserType.findOrCreate({
			where: { key: normalized },
			defaults: {
				key: normalized,
				name: normalized === AUTH_ROLE.DOCTOR ? "Doctor" : "Consumer",
				isActive: true,
			},
		});
	}

	private static signAccessToken(user: User, sessionId: string): string {
		const permissions = user.userTypeData?.permissions?.map((permission) => permission.key) || [];
		const payload: AuthPayload = {
			id: user.id,
			role: this.normalizeRole(user.userType),
			permissions,
			sessionId,
		};

		return jwt.sign(payload, tokenSecret, { expiresIn: tokenExpirationTime });
	}

	private static signRefreshToken(user: User, sessionId: string): string {
		return jwt.sign(
			{
				id: user.id,
				role: this.normalizeRole(user.userType),
				type: "refresh",
				sessionId,
			},
			refreshTokenSecret,
			{ expiresIn: refreshTokenExpirationTime }
		);
	}

	private static async issueSession(user: User) {
		const sessionId = genAlphaNum(16);
		const accessToken = this.signAccessToken(user, sessionId);
		const refreshToken = this.signRefreshToken(user, sessionId);

		await UserToken.setToken(user.id, accessToken, refreshToken);

		const userAuth = await UserAuth.findByUserId(user.id);
		if (userAuth) {
			userAuth.refreshToken = refreshToken;
			userAuth.emailVerified = true;
			await userAuth.save();
		}

		return { accessToken, refreshToken };
	}

	private static async findUserByEmail(email: string): Promise<User | null> {
		return User.findByEmail(email.toLowerCase().trim());
	}

	private static async getUserResponse(userId: number) {
		const user = await User.findById(userId);
		if (!user) {
			throw new Error(RESPONSE_MESSAGES.USER_NOT_FOUND);
		}

		return {
			user: {
				id: user.id,
				email: user.email,
				role: this.normalizeRole(user.userType),
				firstName: user.firstName,
				lastName: user.lastName,
			},
			profileStatus: this.buildProfileStatus(user),
			profileSummary: this.buildProfileSummary(user),
		};
	}

	private static buildProfileSummary(user: User) {
		const role = this.normalizeRole(user.userType);
		if (role === AUTH_ROLE.CONSUMER) {
			return {
				profile: serializeConsumerProfile(user.userProfile),
			};
		}

		return {
			profile: user.doctorProfile
				? {
						profileImage: user.doctorProfile.profileImage,
						phoneNumber: user.doctorProfile.phoneNumber,
						medicalLicenseNumber: user.doctorProfile.medicalLicenseNumber,
						yearsOfExperience: user.doctorProfile.yearsOfExperience,
						bio: user.doctorProfile.bio,
						address: {
							addressLine1: user.doctorProfile.addressLine1,
							addressLine2: user.doctorProfile.addressLine2,
							city: user.doctorProfile.city,
							state: user.doctorProfile.state,
						},
						educationHistoryCount: user.educationalHistories?.length || 0,
						workHistoryCount: user.workHistories?.length || 0,
						specialtiesCount: user.userSpecialities?.filter((item) => item.isActive).length || 0,
				  }
				: null,
		};
	}

	private static buildProfileStatus(user: User) {
		const role = this.normalizeRole(user.userType);
		if (role === AUTH_ROLE.CONSUMER) {
			return buildConsumerProfileStatus(user.userProfile);
		}

		const doctorProfile = user.doctorProfile;
		const educationCount = user.educationalHistories?.length || 0;
		const workHistoryCount = user.workHistories?.length || 0;
		const specialtyCount = user.userSpecialities?.filter((item) => item.isActive).length || 0;
		const requiredChecks = [
			{ done: Boolean(doctorProfile?.profileImage), nextStep: "doctor_profile_image" },
			{
				done: Boolean(doctorProfile?.addressLine1 && doctorProfile?.city && doctorProfile?.state),
				nextStep: "doctor_address",
			},
			{ done: educationCount > 0, nextStep: "doctor_education" },
			{ done: workHistoryCount > 0, nextStep: "doctor_work_history" },
			{ done: specialtyCount > 0, nextStep: "doctor_specialties" },
		];
		const pending = requiredChecks.find((item) => !item.done);
		const onboardingCompleted = Boolean(doctorProfile?.onboardingCompleted) && !pending;

		return {
			onboardingCompleted,
			profileCompleted: onboardingCompleted,
			nextStep: onboardingCompleted ? null : pending?.nextStep || "doctor_profile_image",
		};
	}

	private static async sendOtpEmail(req: Request, email: string, otp: string) {
		const emailData = {
			otpDigits: otp.split(""),
			browserName: req.headers["user-agent"] || "Unknown",
			deviceOS: req.headers["user-agent"] || "Unknown",
			requestDate: new Date().toLocaleDateString(),
			ipAddress: req.ip,
			supportEmail: "support@quickmedic.com",
		};

		await EmailService.sendOtpEmail(email, emailData);
	}

	static async requestSignupOtp(data: SignupRequestOtpDTO, req: Request): Promise<ApiResponse> {
		const role = this.normalizeRole(data.role);
		const email = data.email.toLowerCase().trim();
		if (role !== AUTH_ROLE.CONSUMER) {
			return { status: false, code: 400, message: "Doctor accounts must use the direct registration endpoint" };
		}

		const [existingByEmail, existingByPhone] = await Promise.all([
			User.findOne({ where: { email } }),
			Promise.resolve(null),
		]);

		if (existingByEmail) {
			return { status: false, code: 400, message: this.getExistingAccountMessage() };
		}

		if (existingByPhone) {
			return { status: false, code: 400, message: RESPONSE_MESSAGES.PHONE_ALREADY_REGISTERED };
		}

		const otp = genRandomNumber(4);
		const sessionId = genAlphaNum(16);

		await UserVerificationService.setSession({
			otp,
			sessionId,
			email,
			userType: role,
			purpose: OTP_PURPOSE.EMAIL_VERIFICATION,
			path: "/auth/signup/request-otp",
			payload: {
				firstName: data.firstName.trim(),
				lastName: data.lastName.trim(),
				email,
				role,
			},
		});

		try {
			await this.sendOtpEmail(req, email, otp);
		} catch (error) {
			if (!isProduction) {
				console.warn("OTP email delivery failed during signup request; returning dev OTP fallback.", error);
				return {
					status: true,
					code: 200,
					message: RESPONSE_MESSAGES.OTP_SENT,
					data: { sessionId, otp },
				};
			}
			await UserVerificationService.delSession(sessionId);
			return {
				status: false,
				code: 500,
				message: RESPONSE_MESSAGES.OTP_DELIVERY_FAILED,
			};
		}

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.OTP_SENT,
			data: { sessionId, otp: isProduction ? undefined : otp },
		};
	}

	static async signup(data: SignupDTO, req: Request): Promise<ApiResponse> {
		return this.requestSignupOtp(data, req);
	}

	static async registerDoctor(data: DoctorRegisterDTO): Promise<ApiResponse> {
		const role = this.normalizeRole(data.role);
		if (role !== AUTH_ROLE.DOCTOR) {
			return { status: false, code: 400, message: "Only doctor registration is supported on this endpoint" };
		}

		if (data.password !== data.confirmPassword) {
			return { status: false, code: 400, message: "Confirm password must match password" };
		}

		const email = data.email.toLowerCase().trim();
		const phoneNumber = data.phoneNumber.trim();
		const medicalLicenseNumber = (data.medicalLicenseNumber || data.verificationNumber || "").trim();

		const [existingByEmail, existingByPhone] = await Promise.all([
			User.findOne({ where: { email } }),
			User.findOne({ where: { phoneNumber } }),
		]);

		if (existingByEmail) {
			return { status: false, code: 400, message: this.getExistingAccountMessage() };
		}

		if (existingByPhone) {
			return { status: false, code: 400, message: RESPONSE_MESSAGES.PHONE_ALREADY_REGISTERED };
		}

		await this.ensureUserType(role);

		const password = await UserAuth.encryptPassword(data.password);
		const user = await User.createUser({
			firstName: data.firstName,
			lastName: data.lastName,
			email,
			phoneNumber,
			userType: role,
			verificationNumber: medicalLicenseNumber,
			medicalLicenseNumber,
		});

		await UserAuth.new({
			userId: user.id,
			identifier: email,
			password,
			emailVerified: true,
		});

		await DoctorProfile.create({
			userId: user.id,
			phoneNumber,
			medicalLicenseNumber,
			onboardingCompleted: false,
			onboardingStep: 1,
		});

		const hydratedUser = await User.findById(user.id);
		if (!hydratedUser) {
			throw new Error(RESPONSE_MESSAGES.USER_NOT_FOUND);
		}

		const { accessToken, refreshToken } = await this.issueSession(hydratedUser);
		const responseData = await this.getUserResponse(hydratedUser.id);

		return {
			status: true,
			code: 201,
			message: RESPONSE_MESSAGES.USER_REGISTERED,
			data: {
				accessToken,
				refreshToken,
				...responseData,
			},
		};
	}

	static async resendOtp(sessionId: string, purpose: OTP_PURPOSE, req: Request): Promise<ApiResponse> {
		const sessionError = await this.getOtpSessionError(sessionId, purpose);
		if (sessionError) {
			return sessionError;
		}
		const session = await UserVerification.getSession(sessionId);
		if (!session) return { status: false, code: 400, message: RESPONSE_MESSAGES.SESSION_NOT_FOUND };

		const otp = genRandomNumber(4);
		const expiresAt = new Date(Date.now() + applicationConfig.otpExpiration * 60 * 1000);

		await UserVerificationService.updateSession(sessionId, {
			otp,
			validated: false,
			expiresAt,
		});

		try {
			await this.sendOtpEmail(req, session.email, otp);
		} catch (error) {
			if (!isProduction) {
				console.warn("OTP email delivery failed during resend; returning dev OTP fallback.", error);
				return {
					status: true,
					code: 200,
					message: RESPONSE_MESSAGES.OTP_SENT,
					data: { sessionId, otp },
				};
			}
			return {
				status: false,
				code: 500,
				message: RESPONSE_MESSAGES.OTP_DELIVERY_FAILED,
			};
		}

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.OTP_SENT,
			data: { sessionId, otp: isProduction ? undefined : otp },
		};
	}

	static async verifyOtp(data: VerifyOtpDTO, purpose: OTP_PURPOSE): Promise<ApiResponse> {
		const sessionError = await this.getOtpSessionError(data.sessionId, purpose);
		if (sessionError) {
			return sessionError;
		}

		const isValid = await UserVerificationService.validateOTP(data.sessionId, data.otp);
		if (!isValid) {
			return { status: false, code: 400, message: RESPONSE_MESSAGES.OTP_INVALID_OR_EXPIRED };
		}

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.OTP_VERIFIED,
			data: { sessionId: data.sessionId, purpose },
		};
	}

	static async verifyOtpLegacy(sessionId: string, otp: string): Promise<ApiResponse> {
		return this.verifyOtp({ sessionId, otp }, OTP_PURPOSE.EMAIL_VERIFICATION);
	}

	static async completeSignup(data: CompleteSignupDTO): Promise<ApiResponse> {
		const sessionError = await this.getOtpSessionError(data.sessionId, OTP_PURPOSE.EMAIL_VERIFICATION, {
			requireValidated: true,
		});
		if (sessionError) {
			return sessionError;
		}
		const session = await UserVerification.getSession(data.sessionId);
		if (!session) return { status: false, code: 400, message: RESPONSE_MESSAGES.SESSION_NOT_FOUND };

		if (data.password !== data.confirmPassword) {
			return { status: false, code: 400, message: "Confirm password must match password" };
		}

		const pendingPayload = session.payload || {};
		const role = this.normalizeRole(pendingPayload.role || session.userType);
		const email = String(pendingPayload.email || session.email).toLowerCase().trim();
		const whereConditions: Array<{ email: string } | { phoneNumber: string }> = [{ email }];
		if (pendingPayload.phoneNumber) {
			whereConditions.push({ phoneNumber: pendingPayload.phoneNumber });
		}

		const existingUser = await User.findOne({ where: { [Op.or]: whereConditions } });
		if (existingUser) {
			const message =
				existingUser.email?.toLowerCase() === email
					? this.getExistingAccountMessage()
					: RESPONSE_MESSAGES.PHONE_ALREADY_REGISTERED;

			return { status: false, code: 400, message };
		}

		await this.ensureUserType(role);

		const password = await UserAuth.encryptPassword(data.password);
		const user = await User.createUser({
			firstName: pendingPayload.firstName,
			lastName: pendingPayload.lastName,
			email,
			phoneNumber: pendingPayload.phoneNumber,
			userType: role,
			verificationNumber: pendingPayload.medicalLicenseNumber,
			medicalLicenseNumber: pendingPayload.medicalLicenseNumber,
		});

		await UserAuth.new({
			userId: user.id,
			identifier: email,
			password,
			emailVerified: true,
		});

		if (role === AUTH_ROLE.CONSUMER) {
			await UserProfile.createProfile(user.id, {
				phoneNumber: pendingPayload.phoneNumber,
				profileCompleted: false,
				onboardingSkipped: false,
			});
		} else {
			await DoctorProfile.create({
				userId: user.id,
				phoneNumber: pendingPayload.phoneNumber,
				medicalLicenseNumber: pendingPayload.medicalLicenseNumber,
				onboardingCompleted: false,
				onboardingStep: 1,
			});
		}

		await UserVerificationService.delSession(session.sessionId);

		const hydratedUser = await User.findById(user.id);
		if (!hydratedUser) {
			throw new Error(RESPONSE_MESSAGES.USER_NOT_FOUND);
		}

		const { accessToken, refreshToken } = await this.issueSession(hydratedUser);
		const responseData = await this.getUserResponse(hydratedUser.id);

		return {
			status: true,
			code: 201,
			message: RESPONSE_MESSAGES.USER_REGISTERED,
			data: {
				accessToken,
				refreshToken,
				...responseData,
			},
		};
	}

	static async login(data: LoginDTO): Promise<ApiResponse> {
		const user = await this.findUserByEmail(data.email);
		if (!user) {
			return { status: false, code: 404, message: RESPONSE_MESSAGES.INVALID_CREDENTIALS };
		}

		const requestedRole = this.normalizeRole(data.role);
		const actualRole = this.normalizeRole(user.userType);
		if (requestedRole !== actualRole) {
			return { status: false, code: 401, message: RESPONSE_MESSAGES.INVALID_CREDENTIALS };
		}

		if (!user.isActive || user.status !== USER_STATUS.ACTIVE) {
			return { status: false, code: 403, message: RESPONSE_MESSAGES.INACTIVE_USER };
		}

		const authRecord = await UserAuth.findByUserId(user.id);
		if (!authRecord || !authRecord.password) {
			return { status: false, code: 404, message: RESPONSE_MESSAGES.AUTH_RECORD_NOT_FOUND };
		}

		const isValidPassword = await UserAuth.validatePassword(data.password, authRecord.password);
		if (!isValidPassword) {
			return { status: false, code: 401, message: RESPONSE_MESSAGES.INVALID_CREDENTIALS };
		}

		const { accessToken, refreshToken } = await this.issueSession(user);
		const responseData = await this.getUserResponse(user.id);

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.LOGIN_SUCCESSFUL,
			data: {
				accessToken,
				refreshToken,
				...responseData,
			},
		};
	}

	static async requestForgotPasswordOtp(data: ForgotPasswordRequestOtpDTO, req: Request): Promise<ApiResponse> {
		const email = data.email.toLowerCase().trim();
		const user = await this.findUserByEmail(email);
		if (!user) {
			return {
				status: true,
				code: 200,
				message: RESPONSE_MESSAGES.OTP_SENT,
				data: {},
			};
		}

		const otp = genRandomNumber(4);
		const sessionId = genAlphaNum(16);

		await UserVerificationService.setSession({
			otp,
			sessionId,
			email,
			userType: user.userType,
			purpose: OTP_PURPOSE.PASSWORD_RESET,
			path: "/auth/forgot-password/request-otp",
			payload: {
				email,
				role: this.normalizeRole(user.userType),
				userId: user.id,
			},
		});

		try {
			await this.sendOtpEmail(req, email, otp);
		} catch (error) {
			if (!isProduction) {
				console.warn("OTP email delivery failed during forgot-password request; returning dev OTP fallback.", error);
				return {
					status: true,
					code: 200,
					message: RESPONSE_MESSAGES.OTP_SENT,
					data: { sessionId, otp },
				};
			}
			await UserVerificationService.delSession(sessionId);
			return {
				status: false,
				code: 500,
				message: RESPONSE_MESSAGES.OTP_DELIVERY_FAILED,
			};
		}

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.OTP_SENT,
			data: { sessionId, otp: isProduction ? undefined : otp },
		};
	}

	static async requestOtp(data: RequestOtpDTO, req: Request): Promise<ApiResponse> {
		if (data.path && data.path.includes("forgot")) {
			return this.requestForgotPasswordOtp({ email: data.email }, req);
		}
		return this.requestForgotPasswordOtp({ email: data.email }, req);
	}

	static async resetPassword(data: ResetPasswordDTO): Promise<ApiResponse> {
		const sessionError = await this.getOtpSessionError(data.sessionId, OTP_PURPOSE.PASSWORD_RESET, {
			requireValidated: true,
		});
		if (sessionError) {
			return sessionError;
		}
		const session = await UserVerification.getSession(data.sessionId);
		if (!session) return { status: false, code: 400, message: RESPONSE_MESSAGES.SESSION_NOT_FOUND };

		if (data.newPassword !== data.confirmPassword) {
			return { status: false, code: 400, message: "Confirm password must match new password" };
		}

		const email = String(session.payload?.email || session.email).toLowerCase().trim();
		const user = await this.findUserByEmail(email);
		if (!user) {
			return { status: false, code: 404, message: RESPONSE_MESSAGES.USER_NOT_FOUND };
		}

		const authRecord = await UserAuth.findByUserId(user.id);
		if (!authRecord) {
			return { status: false, code: 404, message: RESPONSE_MESSAGES.AUTH_RECORD_NOT_FOUND };
		}

		authRecord.password = await UserAuth.encryptPassword(data.newPassword);
		authRecord.refreshToken = null as any;
		await authRecord.save();
		await UserToken.revokeByUserId(user.id);
		await UserVerificationService.delSession(session.sessionId);

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.PASSWORD_RESET_SUCCESSFUL,
		};
	}

	static async changePassword(userId: number, data: ChangePasswordDTO): Promise<ApiResponse> {
		const user = await User.findById(userId);
		if (!user) {
			return { status: false, code: 404, message: RESPONSE_MESSAGES.USER_NOT_FOUND };
		}

		const authRecord = await UserAuth.findByUserId(userId);
		if (!authRecord || !authRecord.password) {
			return { status: false, code: 404, message: RESPONSE_MESSAGES.AUTH_RECORD_NOT_FOUND };
		}

		const isValidPassword = await UserAuth.validatePassword(data.oldPassword, authRecord.password);
		if (!isValidPassword) {
			return {
				status: false,
				code: 400,
				message: "Old password is incorrect. Please enter the correct password.",
			};
		}

		if (data.oldPassword === data.newPassword) {
			return {
				status: false,
				code: 400,
				message: "Password has been used previously. Please enter a new password.",
			};
		}

		authRecord.password = await UserAuth.encryptPassword(data.newPassword);
		authRecord.refreshToken = null as any;
		await authRecord.save();

		const { accessToken, refreshToken } = await this.issueSession(user);
		const responseData = await this.getUserResponse(user.id);

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.PASSWORD_CHANGED,
			data: {
				accessToken,
				refreshToken,
				...responseData,
			},
		};
	}

	static async setPassword(sessionId: string, password: string): Promise<ApiResponse> {
		return this.completeSignup({ sessionId, password, confirmPassword: password });
	}

	static async resetPasswordLegacy(sessionId: string, newPassword: string): Promise<ApiResponse> {
		return this.resetPassword({ sessionId, newPassword, confirmPassword: newPassword });
	}

	static async refreshToken(data: RefreshTokenDTO): Promise<ApiResponse> {
		let decoded: any;
		try {
			decoded = jwt.verify(data.refreshToken, refreshTokenSecret) as Record<string, any>;
		} catch (_error) {
			return { status: false, code: 401, message: RESPONSE_MESSAGES.INVALID_REFRESH_TOKEN };
		}

		const tokenRecord = await UserToken.findByRefreshToken(data.refreshToken);
		if (!tokenRecord || tokenRecord.userId !== decoded.id) {
			return { status: false, code: 401, message: RESPONSE_MESSAGES.INVALID_REFRESH_TOKEN };
		}

		const user = await User.findById(tokenRecord.userId);
		if (!user) {
			return { status: false, code: 404, message: RESPONSE_MESSAGES.USER_NOT_FOUND };
		}

		const { accessToken, refreshToken } = await this.issueSession(user);
		const responseData = await this.getUserResponse(user.id);

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.TOKEN_REFRESHED,
			data: {
				accessToken,
				refreshToken,
				...responseData,
			},
		};
	}

	static async logout(userId: number, accessToken?: string, refreshToken?: string): Promise<ApiResponse> {
		if (refreshToken) {
			await UserToken.revokeByRefreshToken(refreshToken);
		} else if (accessToken) {
			await UserToken.remove(accessToken);
		} else {
			await UserToken.revokeByUserId(userId);
		}

		const authRecord = await UserAuth.findByUserId(userId);
		if (authRecord) {
			authRecord.refreshToken = null as any;
			await authRecord.save();
		}

		return {
			status: true,
			code: 200,
			message: "Logout successful.",
		};
	}

	static async me(userId: number): Promise<ApiResponse> {
		const responseData = await this.getUserResponse(userId);
		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data: responseData,
		};
	}

	static async generateToken(user: User) {
		return this.signAccessToken(user, genAlphaNum(16));
	}
}
