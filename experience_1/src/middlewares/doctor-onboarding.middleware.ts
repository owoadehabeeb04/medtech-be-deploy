import { NextFunction, Request, Response } from "express";
import { AUTH_ROLE } from "../constants/constant";
import { ERR_USER } from "../constants/error-codes";
import { User } from "../modules/users/User.model";
import { normalizeRole } from "./role.middleware";

const FORBIDDEN_STATUS = 403;

const getDoctorNextStep = (user: User): string | null => {
	const profile = user.doctorProfile;
	if (!profile?.profileImage) return "doctor_profile_image";
	if (!profile?.addressLine1 || !profile?.city || !profile?.state) return "doctor_address";
	if (!user.educationalHistories?.length) return "doctor_education";
	if (!user.workHistories?.length) return "doctor_work_history";
	if (!user.userSpecialities?.filter((item) => item.isActive).length) return "doctor_specialties";
	return null;
};

export const requireDoctorOnboardingCompleted = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { errorCode, user } = req.context;
		const currentRole = normalizeRole(user?.userType || user?.role);

		if (currentRole !== AUTH_ROLE.DOCTOR) {
			res.status(FORBIDDEN_STATUS).json({
				message: "Forbidden: You do not have access to this resource",
				errorCode: errorCode(ERR_USER, "0RC"),
				statusCode: FORBIDDEN_STATUS,
				errors: {},
			});
			return;
		}

		const hydratedUser = await User.findById(user.id);
		if (!hydratedUser) {
			res.status(FORBIDDEN_STATUS).json({
				message: "User not found",
				errorCode: errorCode(ERR_USER, "0DO"),
				statusCode: FORBIDDEN_STATUS,
				errors: {},
			});
			return;
		}

		const nextStep = getDoctorNextStep(hydratedUser);
		if (nextStep || !hydratedUser.doctorProfile?.onboardingCompleted) {
			res.status(FORBIDDEN_STATUS).json({
				message: `Doctor onboarding is incomplete. Next step: ${nextStep || "doctor_profile_image"}`,
				errorCode: errorCode(ERR_USER, "0DP"),
				statusCode: FORBIDDEN_STATUS,
				errors: {},
			});
			return;
		}

		return next();
	} catch (error) {
		console.error("requireDoctorOnboardingCompleted failed", error);
		return next(error);
	}
};
