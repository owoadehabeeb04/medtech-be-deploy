import Joi from "joi";

export const SignupSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).required(),
});

export const VerifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(4).pattern(/^\d+$/).required(),
});

export const CompleteSignupSchema = Joi.object({
  email: Joi.string().email().required(),
  businessName: Joi.string().min(2).max(200).required(),
  phoneNumber: Joi.string().min(10).max(15).required(),
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
  licenseUrl: Joi.string().uri().optional(),
});

export const LoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const ForgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const ResetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required(),
});
