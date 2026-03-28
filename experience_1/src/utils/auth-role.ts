import { AUTH_ROLE, USER_TYPE } from "../constants/constant";

const ROLE_ALIASES: Record<string, string> = {
	[USER_TYPE.CUSTOMER]: AUTH_ROLE.CONSUMER,
	[USER_TYPE.CONSUMER]: AUTH_ROLE.CONSUMER,
	[USER_TYPE.MEDIC]: AUTH_ROLE.DOCTOR,
	[USER_TYPE.DOCTOR]: AUTH_ROLE.DOCTOR,
};

export const normalizeAuthRole = (role: string | undefined | null): string | null => {
	if (!role) return null;
	return ROLE_ALIASES[String(role).toLowerCase()] || null;
};

export const requireNormalizedAuthRole = (role: string | undefined | null): string => {
	const normalized = normalizeAuthRole(role);
	if (!normalized) {
		throw new Error("Invalid role");
	}
	return normalized;
};

export const getAuthRoleAliases = (role: string): string[] => {
	const normalized = requireNormalizedAuthRole(role);
	if (normalized === AUTH_ROLE.CONSUMER) {
		return [AUTH_ROLE.CONSUMER, USER_TYPE.CUSTOMER];
	}

	return [AUTH_ROLE.DOCTOR, USER_TYPE.MEDIC];
};
