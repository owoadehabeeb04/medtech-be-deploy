import { OAUTH_PROVIDERS } from "../../constants/constant";

export interface LoginDTO {
	email: string;
	password: string;
	role: string;
}

export interface SignupRequestOtpDTO {
	firstName: string;
	lastName: string;
	email: string;
	role: string;
}

export interface DoctorRegisterDTO {
	firstName: string;
	lastName: string;
	email: string;
	phoneNumber: string;
	password: string;
	confirmPassword: string;
	role: string;
	medicalLicenseNumber?: string;
	verificationNumber?: string;
}

export interface SignupDTO extends SignupRequestOtpDTO {
	userType?: string;
	password?: string;
	verificationNumber?: string;
	phoneNumber?: string;
	medicalLicenseNumber?: string;
}

export interface VerifyOtpDTO {
	sessionId: string;
	otp: string;
}

export interface ResendOtpDTO {
	sessionId: string;
}

export interface CompleteSignupDTO {
	sessionId: string;
	password: string;
	confirmPassword: string;
}

export interface ForgotPasswordRequestOtpDTO {
	email: string;
}

export interface RequestOtpDTO extends ForgotPasswordRequestOtpDTO {
	userType?: string;
	path?: string;
	phoneNumber?: string;
}

export interface ResetPasswordDTO {
	sessionId: string;
	newPassword: string;
	confirmPassword: string;
}

export interface ChangePasswordDTO {
	oldPassword: string;
	newPassword: string;
	confirmNewPassword: string;
}

export interface RefreshTokenDTO {
	refreshToken: string;
}

export interface LogoutDTO {
	refreshToken?: string;
}

export interface UserAuthDTO {
	userId?: number;
	password: string;
	identifier: string;
	refreshToken?: string;
	emailVerified?: boolean;
	oauthProvider?: OAUTH_PROVIDERS;
	oauthId?: string;
	oauthAccessToken?: string;
	oauthRefreshToken?: string;
	oauthExpiryDate?: Date;
}
