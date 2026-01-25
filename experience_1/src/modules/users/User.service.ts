import { RESPONSE_MESSAGES } from "../../constants/response";
import { formatPhoneCode } from "../../utils";
import { ApiResponse } from "../../utils/common.dto";
import { UserAuth } from "../user_auth/UserAuth.model";
import { CompleteProfileDTO, CreateUserDTO, UsernameDTO, MedicCompleteProfileDTO } from "./User.dto";
import { User } from "./User.model";
import { UserProfile } from "../user_profile/UserProfile.model";
import { EducationalHistory } from "../educational_history/EducationalHistory.model";
import { WorkHistory } from "../work_history/WorkHistory.model";
import { UserSpeciality } from "../user_specialities/UserSpecialities.model";
import { Sequelize } from "sequelize-typescript";

export class UserService {
	static async createUser(data: CreateUserDTO): Promise<ApiResponse> {
		const newUser = await User.createUser({
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email,
			verificationNumber: data.verificationNumber,
			userType: data.userType,
			tnc: data.tnc,
		});

		let password: string;

		if (data.password) password = await UserAuth.encryptPassword(data.password);

		await UserAuth.createAuth(data.email, password);

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.USER_REGISTERED,
			data: newUser,
		};
	}

	static async createCustomerUserName(data: UsernameDTO, userDt: User): Promise<ApiResponse> {
		const { userName } = data;

		const normalizedUserName = userName.trim().toLowerCase();

		if(!userDt){
			return {
				status: false,
				code: 401,
				message: RESPONSE_MESSAGES.UNAUTHORIZED,
			};
		}

		const user = await User.findByEmail(userDt.email, userDt.userType);

		if (!user) {
			return {
				status: false,
				code: 404,
				message: RESPONSE_MESSAGES.USER_NOT_FOUND,
			};
		}

		// Check if username is already taken by someone else
		const existing = await User.findByUsername(normalizedUserName);

		if (existing && existing.id !== user.id) {
			return {
				status: false,
				code: 400,
				message: RESPONSE_MESSAGES.USER_NAME_NOT_FREE,
			};
		}

		// Update
		user.userName = normalizedUserName;
		await user.save();

		return {
			status: true,
			code: 200,
			message: "Username updated successfully",
			data: { id: user.id, userName: user.userName },
		};
	}

	static async completeCustomerProfile(data: CompleteProfileDTO, userDt: User): Promise<ApiResponse> {
		const { phoneNumber, dob, houseNumber, street, lga, state, profilePicture, dialCode = "234" } = data;

		const user = await User.findByEmail(userDt.email, userDt.userType);

		if (!user) {
			return {
				status: false,
				code: 404,
				message: RESPONSE_MESSAGES.USER_NOT_FOUND,
			};
		}

		// Update
		if (phoneNumber) user.phoneNumber = formatPhoneCode(dialCode, phoneNumber);
		if (dob) user.dob = dob;
		if (profilePicture) user.profilePicture = profilePicture;
		await user.save();

		const profileDt: Record<string, any> = {};

		profileDt.addressLine1 = [houseNumber, street, lga].filter(Boolean).join(", ");
		if (state) profileDt.state = state;

		if (Object.keys(profileDt).length > 0) await UserProfile.createProfile(user.id, profileDt);

		return {
			status: true,
			code: 200,
			message: "Profile completed successfully",
			data: user,
		};
	}

	static async medicCompleteProfile(data: MedicCompleteProfileDTO, userDt: User, sequelize: Sequelize): Promise<ApiResponse> {
		const { address, education, workHistory, speciality } = data;

		await sequelize.transaction(async (transaction: any) => {
			const profileAddress = {
				userId: userDt.id,
				addressLine1: address.line1?.toLowerCase() || null,
				addressLine2: address.line2?.toLowerCase() || null,
				city: address.city?.toLowerCase() || null,
				state: address.state?.toLowerCase() || null,
			};

			const educationDt = education.map((edu) => ({
				userId: userDt.id,
				institution: edu.institution?.toLowerCase() || null,
				certificate: edu.certificate,
				startDate: edu.startDate,
				endDate: edu.endDate,
			}));

			const workHistoryDt = workHistory.map((work) => ({
				userId: userDt.id,
				company: work.company?.toLowerCase() || null,
				designation: work.designation?.toLowerCase() || null,
				startDate: work.startDate,
				endDate: work.endDate,
			}));

			const specialityDt = speciality.map((spec) => ({
				userId: userDt.id,
				specialityId: spec.specialityId,
				yearsOfExperience: spec.yearsOfExperience,
				bio: spec.bio?.toLowerCase() || null,
			}));

			// ❗ remove the "await" in Promise.all — Promise.all already expects promises
			await Promise.all([
				UserProfile.createProfile(userDt.id, profileAddress, transaction),
				EducationalHistory.bulkCreate(educationDt, { transaction }),
				WorkHistory.bulkCreate(workHistoryDt, { transaction }),
				UserSpeciality.bulkCreate(specialityDt, { transaction }), // <-- should be bulkCreate
			]);
		});

		return {
			status: true,
			code: 200,
			message: "Profile completed successfully",
			data: null,
		};
	}

	static async getMedicsBySpeciality(specialityId: number): Promise<ApiResponse> {
		const result = await UserSpeciality.getMedicsBySpeciality(specialityId);
		return {
			status: true,
			code: 200,
			data: result,
			message: "Medics retrieved successfully",
		};
	}
}
