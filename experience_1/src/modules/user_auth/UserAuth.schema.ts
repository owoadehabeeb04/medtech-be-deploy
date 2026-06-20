import Joi from "joi";
import { AUTH_ROLE, USER_TYPE } from "../../constants/constant";

const roleSchema = Joi.string()
	.valid(USER_TYPE.CUSTOMER, USER_TYPE.MEDIC, AUTH_ROLE.CONSUMER, AUTH_ROLE.DOCTOR)
	.required();

const passwordSchema = Joi.string()
	.min(8)
	.max(100)
	.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)
	.messages({
		"string.pattern.base": "Password must include uppercase, lowercase, number, and special character",
	});

export const SignupRequestOtpSchema = Joi.object({
	firstName: Joi.string().min(2).max(40).required(),
	lastName: Joi.string().min(2).max(40).required(),
	email: Joi.string().email().required(),
	role: Joi.string().valid(USER_TYPE.CUSTOMER, AUTH_ROLE.CONSUMER).required(),
});

export const RegisterSchema = Joi.object({
	firstName: Joi.string().min(2).max(40).required(),
	lastName: Joi.string().min(2).max(40).required(),
	email: Joi.string().email().required(),
	phoneNumber: Joi.string().min(7).max(20).required(),
	password: passwordSchema.required(),
	confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
		"any.only": "Confirm password must match password",
	}),
	role: Joi.string()
		.valid(USER_TYPE.CUSTOMER, USER_TYPE.MEDIC, AUTH_ROLE.CONSUMER, AUTH_ROLE.DOCTOR)
		.required(),
	medicalLicenseNumber: Joi.when("role", {
		is: Joi.valid(USER_TYPE.MEDIC, AUTH_ROLE.DOCTOR),
		then: Joi.string().min(3).max(100).required(),
		otherwise: Joi.string().min(3).max(100).optional(),
	}),
	verificationNumber: Joi.string().optional().allow("", null),
});

export const VerifyOtpSchema = Joi.object({
	sessionId: Joi.string().required(),
	otp: Joi.string().pattern(/^\d{4,6}$/).required(),
});

export const ResendOtpSchema = Joi.object({
	sessionId: Joi.string().required(),
});

export const CompleteSignupSchema = Joi.object({
	sessionId: Joi.string().required(),
	password: passwordSchema.required(),
	confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
		"any.only": "Confirm password must match password",
	}),
});

export const LoginSchema = Joi.object({
	email: Joi.string().email().required(),
	password: Joi.string().min(8).max(100).required(),
	role: roleSchema,
});

export const ForgotPasswordRequestOtpSchema = Joi.object({
	email: Joi.string().email().required(),
});

export const RequestOtpSchema = ForgotPasswordRequestOtpSchema;

export const ResetPasswordSchema = Joi.object({
	sessionId: Joi.string().required(),
	newPassword: passwordSchema.required(),
	confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required().messages({
		"any.only": "Confirm password must match new password",
	}),
});

export const ChangePasswordSchema = Joi.object({
	oldPassword: Joi.string().min(8).max(100).required(),
	newPassword: passwordSchema.required(),
	confirmNewPassword: Joi.string().valid(Joi.ref("newPassword")).required().messages({
		"any.only": "Confirm new password must match new password",
	}),
});

export const RefreshTokenSchema = Joi.object({
	refreshToken: Joi.string().required(),
});

export const LogoutSchema = Joi.object({
	refreshToken: Joi.string().optional(),
});

export const SetPasswordSchema = Joi.object({
	sessionId: Joi.string().required(),
	password: passwordSchema.required(),
});

export const SignUpSchema = SignupRequestOtpSchema;
