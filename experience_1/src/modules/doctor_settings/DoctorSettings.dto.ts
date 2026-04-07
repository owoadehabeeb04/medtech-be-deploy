export interface UpdateDoctorSettingsPreferencesDTO {
	pushNotificationsEnabled?: boolean;
	biometricLoginEnabled?: boolean;
	autoLogoutOnAppClose?: boolean;
}

export interface UpsertDoctorDeviceTokenDTO {
	deviceId: string;
	deviceToken: string;
	platform: "ios" | "android";
}
