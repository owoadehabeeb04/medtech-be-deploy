export enum USER_STATUS {
	ACTIVE = "active",
	INACTIVE = "inactive",
	SUSPENDED = "suspended",
}

export enum APPOINTMENT_STATUS {
	PENDING = "pending",
	CONFIRMED = "confirmed",
	CANCELLED = "cancelled",
	CHECKED_IN = "checked_in",
	IN_PROGRESS = "in_progress",
	COMPLETED = "completed",
	NO_SHOW = "no_show",
}

export enum USER_TYPE {
	CUSTOMER = "customer",
	MEDIC = "medic",
	ADMIN = "admin",
	VENDOR = "vendor",
	CONSUMER = "consumer",
	DOCTOR = "doctor",
}

export enum AUTH_ROLE {
	CONSUMER = "consumer",
	DOCTOR = "doctor",
}

export enum OTP_PURPOSE {
	EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
	PASSWORD_RESET = "PASSWORD_RESET",
}

export enum NOTIFICATION_TYPE {
	EMAIL = "email",
	PORTAL = "portal",
	BOTH = "both",
}

export enum NOTIFICATION_STATUS {
	READ = "read",
	UNREAD = "unread",
}

export enum OTP_IDENTIFIER_TYPE {
	EMAIL = "email",
	PHONE = "phone",
}

export enum OAUTH_PROVIDERS {
	GOOGLE = "google",
	FACEBOOK = "facebook",
	GITHUB = "github",
}

export enum APPOINTMENT_TYPE {
	PERSONAL = "personal",
	ANOTHER = "another",
	PET = "pet",
}
