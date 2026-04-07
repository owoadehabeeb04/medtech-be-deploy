import Joi from "joi";

export const UpdateDoctorSettingsPreferencesSchema = Joi.object({
	pushNotificationsEnabled: Joi.boolean().optional(),
	biometricLoginEnabled: Joi.boolean().optional(),
	autoLogoutOnAppClose: Joi.boolean().optional(),
}).min(1);

export const UpsertDoctorDeviceTokenSchema = Joi.object({
	deviceId: Joi.string().trim().min(1).max(255).required(),
	deviceToken: Joi.string().trim().min(1).max(2048).required(),
	platform: Joi.string().valid("ios", "android").required(),
});

export const DoctorDeviceTokenParamsSchema = Joi.object({
	deviceId: Joi.string().trim().min(1).max(255).required(),
});
