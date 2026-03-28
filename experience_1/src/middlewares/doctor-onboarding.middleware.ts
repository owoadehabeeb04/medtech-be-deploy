import { NextFunction, Request, Response } from "express";
import { FORBIDDEN } from "http-status";
import { AUTH_ROLE } from "../constants/constant";
import { ERR_USER } from "../constants/error-codes";
import { User } from "../modules/users/User.model";
import { normalizeRole } from "./role.middleware";

const getDoctorNextStep = (user: User): string | null => {
	const profile = user.doctorProfile;
	if (!profile?.profileImage) return "doctor_profile_image";
	if (!profile?.addressLine1 || !profile?.city || !profile?.state) return "doctor_address";
	if (!user.educationalHistories?.length) return "doctor_education";
	if (!user.workHistories?.length) return "doctor_work_history";
	if (!user.userSpecialities?.filter((item) => item.isActive).length) return "doctor_specialties";
	return null;
};

export const requireDoctorOnboardingCompleted = async (req: Request, _: Response, next: NextFunction) => {
	try {
		const { manageApplicationErrors, errorCode, user } = req.context;
		const currentRole = normalizeRole(user?.userType || user?.role);

		if (currentRole !== AUTH_ROLE.DOCTOR) {
			return next(
				manageApplicationErrors({
					message: "Forbidden: You do not have access to this resource",
					statusCode: FORBIDDEN,
					errorCode: errorCode(ERR_USER, "0RC"),
				})
			);
		}

		const hydratedUser = await User.findById(user.id);
		if (!hydratedUser) {
			return next(
				manageApplicationErrors({
					message: "User not found",
					statusCode: FORBIDDEN,
					errorCode: errorCode(ERR_USER, "0DO"),
				})
			);
		}

		const nextStep = getDoctorNextStep(hydratedUser);
		if (nextStep || !hydratedUser.doctorProfile?.onboardingCompleted) {
			return next(
				manageApplicationErrors({
					message: `Doctor onboarding is incomplete. Next step: ${nextStep || "doctor_profile_image"}`,
					statusCode: FORBIDDEN,
					errorCode: errorCode(ERR_USER, "0DP"),
				})
			);
		}

		return next();
	} catch (error) {
		return next(error);
	}
};
