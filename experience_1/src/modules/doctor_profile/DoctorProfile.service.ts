import { ApiResponse } from "../../utils/common.dto";
import AwsUtil_s3 from "../../utils/aws.s3";
import { genAlphaNum } from "../../utils";
import { User } from "../users/User.model";
import { DoctorProfile } from "./DoctorProfile.model";
import {
	DoctorAccountDTO,
	DoctorAddressDTO,
	DoctorBasicProfileDTO,
	DoctorEducationDTO,
	DoctorSpecialtiesDTO,
	DoctorWorkHistoryDTO,
} from "./DoctorProfile.dto";
import { EducationalHistory } from "../educational_history/EducationalHistory.model";
import { WorkHistory } from "../work_history/WorkHistory.model";
import { UserSpeciality } from "../user_specialities/UserSpecialities.model";
import { Speciality } from "../speciality/Speciality.model";

type DoctorProfileStatus = {
	onboardingCompleted: boolean;
	profileCompleted: boolean;
	nextStep: string | null;
};

export class DoctorProfileService {
	private static async getHydratedUser(userId: number) {
		return User.findById(userId);
	}

	private static normalizeString(value?: string | null): string | undefined {
		if (value === undefined || value === null) return undefined;
		return value.trim();
	}

	private static normalizeNullableString(value?: string | null): string | null | undefined {
		if (value === undefined) return undefined;
		if (value === null) return null;
		const trimmed = value.trim();
		return trimmed.length ? trimmed : null;
	}

	private static normalizePhoneNumber(value?: string | null): string | undefined {
		if (value === undefined || value === null) return undefined;
		return value.trim().replace(/[()\-\s]/g, "");
	}

	private static getNextStepFromState(
		profile: Partial<DoctorProfile> | null | undefined,
		educationCount: number,
		workHistoryCount: number,
		specialtyCount: number
	) {
		if (!profile?.profileImage) return "doctor_profile_image";
		if (!profile?.addressLine1 || !profile?.city || !profile?.state) return "doctor_address";
		if (!educationCount) return "doctor_education";
		if (!workHistoryCount) return "doctor_work_history";
		if (!specialtyCount) return "doctor_specialties";
		return null;
	}

	private static buildProfileStatus(
		profile: Partial<DoctorProfile> | null | undefined,
		educationCount: number,
		workHistoryCount: number,
		specialtyCount: number
	): DoctorProfileStatus {
		const nextStep = this.getNextStepFromState(profile, educationCount, workHistoryCount, specialtyCount);
		return {
			onboardingCompleted: !nextStep,
			profileCompleted: !nextStep,
			nextStep,
		};
	}

	private static async syncProfileCompletion(userId: number) {
		const user = await this.getHydratedUser(userId);
		if (!user || !user.doctorProfile) return user;
		const profileStatus = this.buildProfileStatus(
			user.doctorProfile,
			user.educationalHistories?.length || 0,
			user.workHistories?.length || 0,
			user.userSpecialities?.filter((item) => item.isActive).length || 0
		);
		user.doctorProfile.onboardingStep = profileStatus.nextStep
			? {
					doctor_profile_image: 1,
					doctor_address: 2,
					doctor_education: 3,
					doctor_work_history: 4,
					doctor_specialties: 5,
			  }[profileStatus.nextStep] || 1
			: 5;
		user.doctorProfile.onboardingCompleted = profileStatus.onboardingCompleted;
		await user.doctorProfile.save();
		user.isProfileComplete = profileStatus.profileCompleted;
		await user.save();
		return this.getHydratedUser(userId);
	}

	private static response(user: User, message: string): ApiResponse {
		const profileStatus = this.buildProfileStatus(
			user.doctorProfile,
			user.educationalHistories?.length || 0,
			user.workHistories?.length || 0,
			user.userSpecialities?.filter((item) => item.isActive).length || 0
		);
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
				profileStatus,
			},
		};
	}

	private static async ensureDoctorProfile(userId: number) {
		return DoctorProfile.findOne({ where: { userId } });
	}

	private static async ensurePhoneNumberAvailable(userId: number, phoneNumber?: string) {
		if (!phoneNumber) return null;
		const existingPhone = await User.findOne({ where: { phoneNumber } });
		if (existingPhone && existingPhone.id !== userId) {
			return { status: false, code: 400, message: "This phone number is already registered." } as ApiResponse;
		}
		return null;
	}

	private static mapEducationPayload(data: DoctorEducationDTO) {
		return {
			institute: this.normalizeString(data.institution ?? data.institute)!,
			certificate: this.normalizeString(data.certificate)!,
			startDate: data.startDate,
			endDate: data.endDate ?? null,
		};
	}

	private static mapWorkHistoryPayload(data: DoctorWorkHistoryDTO) {
		return {
			company: this.normalizeString(data.companyOrInstitution ?? data.company)!,
			designation: this.normalizeString(data.designation)!,
			startDate: data.startDate,
			endDate: data.endDate ?? null,
		};
	}

	private static serializeEducationHistory(records: EducationalHistory[]) {
		return records.map((record) => ({
			id: record.id,
			institution: record.institute,
			certificate: record.certificate,
			startDate: record.startDate,
			endDate: record.endDate,
		}));
	}

	private static serializeWorkHistory(records: WorkHistory[]) {
		return records.map((record) => ({
			id: record.id,
			companyOrInstitution: record.company,
			designation: record.designation,
			startDate: record.startDate,
			endDate: record.endDate,
		}));
	}

	private static serializeSpecialtyInformation(profile: DoctorProfile, records: UserSpeciality[]) {
		const specialties = records
			.filter((record) => record.isActive && record.speciality)
			.map((record) => ({
				id: record.specialityId,
				name: record.speciality?.name || "",
				key: record.speciality?.key || "",
			}))
			.sort((left, right) => left.name.localeCompare(right.name));

		return {
			specialtyIds: specialties.map((specialty) => specialty.id),
			specialtyNames: specialties.map((specialty) => specialty.name),
			specialties,
			yearsOfExperience: profile.yearsOfExperience ?? 0,
			bio: profile.bio ?? "",
		};
	}

	private static async buildProfileInformationResponse(userId: number, message: string): Promise<ApiResponse> {
		const [user, profile, educationHistory, workHistory, specialtySelections] = await Promise.all([
			User.findByPk(userId, {
				attributes: ["id", "firstName", "lastName", "phoneNumber", "email"],
			}),
			DoctorProfile.findOne({ where: { userId } }),
			EducationalHistory.findAll({
				where: { userId },
				order: [
					["startDate", "DESC"],
					["createdAt", "DESC"],
				],
			}),
			WorkHistory.findAll({
				where: { userId },
				order: [
					["startDate", "DESC"],
					["createdAt", "DESC"],
				],
			}),
			UserSpeciality.findAll({
				where: { userId, isActive: true },
				include: [{ model: Speciality, as: "speciality", attributes: ["id", "name", "key", "isActive"] }],
			}),
		]);

		if (!user) return { status: false, code: 404, message: "User not found" };
		if (!profile) return { status: false, code: 404, message: "Doctor profile not found" };

		const profileStatus = this.buildProfileStatus(profile, educationHistory.length, workHistory.length, specialtySelections.length);

		return {
			status: true,
			code: 200,
			message,
			data: {
				accountInformation: {
					firstName: user.firstName,
					lastName: user.lastName,
					phoneNumber: user.phoneNumber || profile.phoneNumber || null,
					email: user.email,
					profileImageUrl: profile.profileImage || null,
				},
				contactAddress: {
					addressLine1: profile.addressLine1 || null,
					addressLine2: profile.addressLine2 || null,
					city: profile.city || null,
					state: profile.state || null,
					country: profile.country || null,
					postalCode: profile.postalCode || null,
				},
				educationHistory: this.serializeEducationHistory(educationHistory),
				workHistory: this.serializeWorkHistory(workHistory),
				specialtyInformation: this.serializeSpecialtyInformation(profile, specialtySelections),
				profileStatus,
			},
		};
	}

	static async getProfile(userId: number): Promise<ApiResponse> {
		const user = await this.getHydratedUser(userId);
		if (!user) return { status: false, code: 404, message: "User not found" };
		return this.response(user, "Doctor profile retrieved successfully");
	}

	static async getProfileMe(userId: number): Promise<ApiResponse> {
		return this.buildProfileInformationResponse(userId, "Doctor profile information retrieved successfully");
	}

	static async updateAccount(userId: number, data: DoctorAccountDTO): Promise<ApiResponse> {
		const user = await User.findByPk(userId, {
			attributes: ["id", "firstName", "lastName", "phoneNumber", "email"],
		});
		if (!user) return { status: false, code: 404, message: "User not found" };

		const doctorProfile = await this.ensureDoctorProfile(userId);
		if (!doctorProfile) return { status: false, code: 404, message: "Doctor profile not found" };

		const phoneNumber = this.normalizePhoneNumber(data.phoneNumber);
		const phoneConflict = await this.ensurePhoneNumberAvailable(userId, phoneNumber);
		if (phoneConflict) return phoneConflict;

		const firstName = this.normalizeString(data.firstName);
		const lastName = this.normalizeString(data.lastName);
		if (firstName !== undefined) user.firstName = firstName;
		if (lastName !== undefined) user.lastName = lastName;
		if (phoneNumber !== undefined) {
			user.phoneNumber = phoneNumber;
			doctorProfile.phoneNumber = phoneNumber;
		}

		await Promise.all([user.save(), doctorProfile.save()]);

		const aggregateResponse = await this.buildProfileInformationResponse(userId, "Doctor profile information retrieved successfully");
		if (!aggregateResponse.status) return aggregateResponse;

		return {
			status: true,
			code: 200,
			message: "Doctor account information updated successfully",
			data: {
				accountInformation: aggregateResponse.data.accountInformation,
				profileStatus: aggregateResponse.data.profileStatus,
			},
		};
	}

	static async upsertBasic(userId: number, data: DoctorBasicProfileDTO): Promise<ApiResponse> {
		const user = await this.getHydratedUser(userId);
		if (!user) return { status: false, code: 404, message: "User not found" };

		const phoneNumber = this.normalizePhoneNumber(data.phoneNumber);
		const phoneConflict = await this.ensurePhoneNumberAvailable(userId, phoneNumber);
		if (phoneConflict) return phoneConflict;

		const firstName = this.normalizeString(data.firstName);
		const lastName = this.normalizeString(data.lastName);
		if (firstName !== undefined) user.firstName = firstName;
		if (lastName !== undefined) user.lastName = lastName;
		if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
		await user.save();

		const doctorProfile = await this.ensureDoctorProfile(userId);
		if (!doctorProfile) return { status: false, code: 404, message: "Doctor profile not found" };

		const medicalLicenseNumber = this.normalizeString(data.medicalLicenseNumber);
		const bio = data.bio !== undefined ? this.normalizeString(data.bio) ?? "" : doctorProfile.bio;
		await doctorProfile.update({
			phoneNumber: phoneNumber ?? doctorProfile.phoneNumber ?? user.phoneNumber,
			medicalLicenseNumber: medicalLicenseNumber ?? doctorProfile.medicalLicenseNumber,
			yearsOfExperience: data.yearsOfExperience ?? doctorProfile.yearsOfExperience,
			bio,
		});

		const updatedUser = await this.syncProfileCompletion(userId);
		return this.response(updatedUser!, "Doctor basic profile updated successfully");
	}

	static async updateImage(userId: number, file: Express.Multer.File): Promise<ApiResponse> {
		const doctorProfile = await this.ensureDoctorProfile(userId);
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
		const doctorProfile = await this.ensureDoctorProfile(userId);
		if (!doctorProfile) return { status: false, code: 404, message: "Doctor profile not found" };

		await doctorProfile.update({
			addressLine1: this.normalizeString(data.addressLine1) ?? doctorProfile.addressLine1,
			addressLine2: this.normalizeNullableString(data.addressLine2),
			city: this.normalizeString(data.city) ?? doctorProfile.city,
			state: this.normalizeString(data.state) ?? doctorProfile.state,
			country: this.normalizeNullableString(data.country),
			postalCode: this.normalizeNullableString(data.postalCode),
		});

		const updatedUser = await this.syncProfileCompletion(userId);
		return this.response(updatedUser!, "Doctor address updated successfully");
	}

	static async listEducationHistory(userId: number): Promise<ApiResponse> {
		const educationHistory = await EducationalHistory.findAll({
			where: { userId },
			order: [
				["startDate", "DESC"],
				["createdAt", "DESC"],
			],
		});

		return {
			status: true,
			code: 200,
			message: "Doctor education history retrieved successfully",
			data: {
				educationHistory: this.serializeEducationHistory(educationHistory),
			},
		};
	}

	static async createEducation(userId: number, data: DoctorEducationDTO): Promise<ApiResponse> {
		await EducationalHistory.create({ userId, ...this.mapEducationPayload(data) });
		const updatedUser = await this.syncProfileCompletion(userId);
		return this.response(updatedUser!, "Doctor education history added successfully");
	}

	static async updateEducation(userId: number, educationId: number, data: DoctorEducationDTO): Promise<ApiResponse> {
		const education = await EducationalHistory.findOne({ where: { id: educationId, userId } });
		if (!education) return { status: false, code: 404, message: "Education record not found" };
		await education.update(this.mapEducationPayload(data));
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

	static async listWorkHistory(userId: number): Promise<ApiResponse> {
		const workHistory = await WorkHistory.findAll({
			where: { userId },
			order: [
				["startDate", "DESC"],
				["createdAt", "DESC"],
			],
		});

		return {
			status: true,
			code: 200,
			message: "Doctor work history retrieved successfully",
			data: {
				workHistory: this.serializeWorkHistory(workHistory),
			},
		};
	}

	static async createWorkHistory(userId: number, data: DoctorWorkHistoryDTO): Promise<ApiResponse> {
		await WorkHistory.create({ userId, ...this.mapWorkHistoryPayload(data) });
		const updatedUser = await this.syncProfileCompletion(userId);
		return this.response(updatedUser!, "Doctor work history added successfully");
	}

	static async updateWorkHistory(userId: number, workId: number, data: DoctorWorkHistoryDTO): Promise<ApiResponse> {
		const workHistory = await WorkHistory.findOne({ where: { id: workId, userId } });
		if (!workHistory) return { status: false, code: 404, message: "Work history record not found" };
		await workHistory.update(this.mapWorkHistoryPayload(data));
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
		const specialityIds = Array.from(new Set(data.specialtyIds ?? data.specialityIds ?? []));
		const existing = await Speciality.findAll({ where: { id: specialityIds, isActive: true } });
		if (existing.length !== specialityIds.length) {
			return { status: false, code: 400, message: "One or more specialties are invalid" };
		}

		const doctorProfile = await this.ensureDoctorProfile(userId);
		if (!doctorProfile) return { status: false, code: 404, message: "Doctor profile not found" };

		const yearsOfExperience = data.yearsOfExperience ?? doctorProfile.yearsOfExperience ?? 0;
		const bio = data.bio !== undefined ? this.normalizeString(data.bio) ?? "" : doctorProfile.bio ?? "";

		const sequelize = UserSpeciality.sequelize;
		if (!sequelize) {
			throw new Error("Database connection is not available");
		}

		await sequelize.transaction(async (transaction) => {
			await doctorProfile.update(
				{
					yearsOfExperience,
					bio,
				},
				{ transaction }
			);

			await UserSpeciality.destroy({ where: { userId }, transaction });
			await UserSpeciality.bulkCreate(
				specialityIds.map((specialityId) => ({
					userId,
					specialityId,
					yearsOfExperience,
					bio,
					isActive: true,
				})),
				{ transaction }
			);
		});

		const updatedUser = await this.syncProfileCompletion(userId);
		return this.response(updatedUser!, "Doctor specialties updated successfully");
	}

	static async completeOnboarding(userId: number): Promise<ApiResponse> {
		const updatedUser = await this.syncProfileCompletion(userId);
		if (!updatedUser) return { status: false, code: 404, message: "User not found" };
		const profileStatus = this.buildProfileStatus(
			updatedUser.doctorProfile,
			updatedUser.educationalHistories?.length || 0,
			updatedUser.workHistories?.length || 0,
			updatedUser.userSpecialities?.filter((item) => item.isActive).length || 0
		);
		if (profileStatus.nextStep) {
			return {
				status: false,
				code: 400,
				message: `Doctor onboarding is incomplete. Next step: ${profileStatus.nextStep}`,
			};
		}
		return this.response(updatedUser, "Doctor onboarding completed successfully");
	}
}
