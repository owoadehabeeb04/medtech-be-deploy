import { ApiResponse } from "../../utils/common.dto";
import AwsUtil_s3 from "../../utils/aws.s3";
import { genAlphaNum } from "../../utils";
import { User } from "../users/User.model";
import { DoctorProfile } from "./DoctorProfile.model";
import { DoctorAddressDTO, DoctorBasicProfileDTO, DoctorEducationDTO, DoctorSpecialtiesDTO, DoctorWorkHistoryDTO } from "./DoctorProfile.dto";
import { EducationalHistory } from "../educational_history/EducationalHistory.model";
import { WorkHistory } from "../work_history/WorkHistory.model";
import { UserSpeciality } from "../user_specialities/UserSpecialities.model";
import { Speciality } from "../speciality/Speciality.model";

export class DoctorProfileService {
	private static async getHydratedUser(userId: number) {
		return User.findById(userId);
	}

	private static getNextStep(user: User) {
		const profile = user.doctorProfile;
		if (!profile?.profileImage) return "doctor_profile_image";
		if (!profile?.addressLine1 || !profile?.city || !profile?.state) return "doctor_address";
		if (!user.educationalHistories?.length) return "doctor_education";
		if (!user.workHistories?.length) return "doctor_work_history";
		if (!user.userSpecialities?.filter((item) => item.isActive).length) return "doctor_specialties";
		return null;
	}

	private static async syncProfileCompletion(userId: number) {
		const user = await this.getHydratedUser(userId);
		if (!user || !user.doctorProfile) return user;
		const nextStep = this.getNextStep(user);
		user.doctorProfile.onboardingStep = nextStep
			? {
					doctor_profile_image: 1,
					doctor_address: 2,
					doctor_education: 3,
					doctor_work_history: 4,
					doctor_specialties: 5,
			  }[nextStep] || 1
			: 5;
		user.doctorProfile.onboardingCompleted = !nextStep;
		await user.doctorProfile.save();
		user.isProfileComplete = !nextStep;
		await user.save();
		return this.getHydratedUser(userId);
	}

	private static response(user: User, message: string): ApiResponse {
		const nextStep = this.getNextStep(user);
		const specialties = (user.userSpecialities || [])
			.filter((item) => item.isActive)
			.map((item) => ({
				id: item.id,
				specialityId: item.specialityId,
				isActive: item.isActive,
			}));
		return {
			status: true,
			code: 200,
			message,
			data: {
				profile: user.doctorProfile,
				educationHistory: user.educationalHistories || [],
				workHistory: user.workHistories || [],
				specialties,
				profileStatus: {
					onboardingCompleted: !nextStep,
					profileCompleted: !nextStep,
					nextStep,
				},
			},
		};
	}

	static async getProfile(userId: number): Promise<ApiResponse> {
		const user = await this.getHydratedUser(userId);
		if (!user) return { status: false, code: 404, message: "User not found" };
		return this.response(user, "Doctor profile retrieved successfully");
	}

	static async upsertBasic(userId: number, data: DoctorBasicProfileDTO): Promise<ApiResponse> {
		const user = await this.getHydratedUser(userId);
		if (!user) return { status: false, code: 404, message: "User not found" };

		if (data.phoneNumber && data.phoneNumber !== user.phoneNumber) {
			const existingPhone = await User.findOne({ where: { phoneNumber: data.phoneNumber } });
			if (existingPhone && existingPhone.id !== userId) {
				return { status: false, code: 400, message: "This phone number is already registered." };
			}
		}

		if (data.firstName) user.firstName = data.firstName.trim().toLowerCase();
		if (data.lastName) user.lastName = data.lastName.trim().toLowerCase();
		if (data.phoneNumber) user.phoneNumber = data.phoneNumber;
		await user.save();

		const doctorProfile = await DoctorProfile.findOne({ where: { userId } });
		if (!doctorProfile) return { status: false, code: 404, message: "Doctor profile not found" };

		await doctorProfile.update({
			phoneNumber: data.phoneNumber ?? doctorProfile.phoneNumber ?? user.phoneNumber,
			medicalLicenseNumber: data.medicalLicenseNumber ?? doctorProfile.medicalLicenseNumber,
			yearsOfExperience: data.yearsOfExperience ?? doctorProfile.yearsOfExperience,
			bio: data.bio ?? doctorProfile.bio,
		});

		const updatedUser = await this.syncProfileCompletion(userId);
		return this.response(updatedUser!, "Doctor basic profile updated successfully");
	}

	static async updateImage(userId: number, file: Express.Multer.File): Promise<ApiResponse> {
		const doctorProfile = await DoctorProfile.findOne({ where: { userId } });
		if (!doctorProfile) return { status: false, code: 404, message: "Doctor profile not found" };

		const ext = file.originalname.includes(".") ? file.originalname.split(".").pop() : "jpg";
		const key = `doctor-profile/${userId}/${Date.now()}-${genAlphaNum(8)}.${ext}`;
		const uploader = new AwsUtil_s3();
		const result = await uploader.uploadBuffer(file.buffer, file.mimetype, key);

		doctorProfile.profileImage = result.location;
		await doctorProfile.save();
		const updatedUser = await this.syncProfileCompletion(userId);
		const response = this.response(updatedUser!, "Doctor profile image updated successfully");
		return {
			...response,
			data: {
				...(response.data || {}),
				upload: {
					key: result.key,
					url: result.location,
				},
			},
		};
	}

	static async updateAddress(userId: number, data: DoctorAddressDTO): Promise<ApiResponse> {
		const doctorProfile = await DoctorProfile.findOne({ where: { userId } });
		if (!doctorProfile) return { status: false, code: 404, message: "Doctor profile not found" };
		await doctorProfile.update(data);
		const updatedUser = await this.syncProfileCompletion(userId);
		return this.response(updatedUser!, "Doctor address updated successfully");
	}

	static async createEducation(userId: number, data: DoctorEducationDTO): Promise<ApiResponse> {
		await EducationalHistory.create({ userId, ...data });
		const updatedUser = await this.syncProfileCompletion(userId);
		return this.response(updatedUser!, "Doctor education history added successfully");
	}

	static async updateEducation(userId: number, educationId: number, data: DoctorEducationDTO): Promise<ApiResponse> {
		const education = await EducationalHistory.findOne({ where: { id: educationId, userId } });
		if (!education) return { status: false, code: 404, message: "Education record not found" };
		await education.update(data);
		const updatedUser = await this.syncProfileCompletion(userId);
		return this.response(updatedUser!, "Doctor education history updated successfully");
	}

	static async deleteEducation(userId: number, educationId: number): Promise<ApiResponse> {
		const education = await EducationalHistory.findOne({ where: { id: educationId, userId } });
		if (!education) return { status: false, code: 404, message: "Education record not found" };
		await education.destroy();
		const updatedUser = await this.syncProfileCompletion(userId);
		return this.response(updatedUser!, "Doctor education history deleted successfully");
	}

	static async createWorkHistory(userId: number, data: DoctorWorkHistoryDTO): Promise<ApiResponse> {
		await WorkHistory.create({ userId, ...data });
		const updatedUser = await this.syncProfileCompletion(userId);
		return this.response(updatedUser!, "Doctor work history added successfully");
	}

	static async updateWorkHistory(userId: number, workId: number, data: DoctorWorkHistoryDTO): Promise<ApiResponse> {
		const workHistory = await WorkHistory.findOne({ where: { id: workId, userId } });
		if (!workHistory) return { status: false, code: 404, message: "Work history record not found" };
		await workHistory.update(data);
		const updatedUser = await this.syncProfileCompletion(userId);
		return this.response(updatedUser!, "Doctor work history updated successfully");
	}

	static async deleteWorkHistory(userId: number, workId: number): Promise<ApiResponse> {
		const workHistory = await WorkHistory.findOne({ where: { id: workId, userId } });
		if (!workHistory) return { status: false, code: 404, message: "Work history record not found" };
		await workHistory.destroy();
		const updatedUser = await this.syncProfileCompletion(userId);
		return this.response(updatedUser!, "Doctor work history deleted successfully");
	}

	static async replaceSpecialties(userId: number, data: DoctorSpecialtiesDTO): Promise<ApiResponse> {
		const specialityIds = Array.from(new Set(data.specialityIds));
		const existing = await Speciality.findAll({ where: { id: specialityIds, isActive: true } });
		if (existing.length !== specialityIds.length) {
			return { status: false, code: 400, message: "One or more specialties are invalid" };
		}

		const doctorProfile = await DoctorProfile.findOne({ where: { userId } });
		if (!doctorProfile) return { status: false, code: 404, message: "Doctor profile not found" };

		await doctorProfile.update({
			yearsOfExperience: data.yearsOfExperience ?? doctorProfile.yearsOfExperience,
			bio: data.bio ?? doctorProfile.bio,
		});

		await UserSpeciality.destroy({ where: { userId } });
		await UserSpeciality.bulkCreate(
			specialityIds.map((specialityId) => ({
				userId,
				specialityId,
				yearsOfExperience: 0,
				bio: "",
				isActive: true,
			}))
		);
		const updatedUser = await this.syncProfileCompletion(userId);
		return this.response(updatedUser!, "Doctor specialties updated successfully");
	}

	static async completeOnboarding(userId: number): Promise<ApiResponse> {
		const updatedUser = await this.syncProfileCompletion(userId);
		if (!updatedUser) return { status: false, code: 404, message: "User not found" };
		const nextStep = this.getNextStep(updatedUser);
		if (nextStep) {
			return {
				status: false,
				code: 400,
				message: `Doctor onboarding is incomplete. Next step: ${nextStep}`,
			};
		}
		return this.response(updatedUser, "Doctor onboarding completed successfully");
	}
}
