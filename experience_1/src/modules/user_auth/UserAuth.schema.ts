import Joi from "joi";

export const SignUpSchema = Joi.object({
	firstName: Joi.string().min(2).max(40).required(),
	lastName: Joi.string().min(2).max(40).required(),
	email: Joi.string().email().required(),
	tnc: Joi.boolean().valid(true).required(),
	userType: Joi.string().required(),
	verificationNumber: Joi.string().optional(),
	password: Joi.string().min(5).max(100).optional(),
});

export const LoginSchema = Joi.object({
	email: Joi.string().email().required(),
	password: Joi.string().min(5).max(100).required(),
	userType: Joi.string().required(),
});

export const RequestOtpSchema = Joi.object({
	identifier: Joi.string().required(),
	userType: Joi.string().required(),
	path: Joi.string().optional(),
});

export const VerifyOtpSchema = Joi.object({
	sessionId: Joi.string().required(),
	otp: Joi.string().required(),
});

export const ResetPasswordSchema = Joi.object({
	sessionId: Joi.string().required(),
	newPassword: Joi.string().min(5).max(100).required(),
});

export const SetPasswordSchema = Joi.object({   
    sessionId: Joi.string().required(),
    password: Joi.string().min(5).max(100).required(),
});