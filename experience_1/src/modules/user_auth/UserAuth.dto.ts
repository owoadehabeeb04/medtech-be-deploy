import { OAUTH_PROVIDERS } from "../../constants/constant";

export interface LoginDTO {
	email: string;
	password: string;
	userType: string;
}

export interface RequestOtpDTO {
	email: string;
	userType: string;
	path?: string;
	phoneNumber?: string;
}

export interface SignupDTO {
	firstName: string;
	lastName: string;
	email: string;
	tnc: boolean;
	userType: string;
	verificationNumber?: string;
	password?: string;
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
