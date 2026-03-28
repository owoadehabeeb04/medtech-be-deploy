import { ApiResponse } from "../../utils/common.dto";
import AwsUtil_s3 from "../../utils/aws.s3";
import { genAlphaNum } from "../../utils";
import { User } from "../users/User.model";
import { UserProfile } from "../user_profile/UserProfile.model";
import { ConsumerProfileDTO } from "./ConsumerProfile.dto";
import {
	buildConsumerProfileStatus,
	getCurrentConsumerOnboardingStep,
	getPersistedConsumerSkippedSteps,
	serializeConsumerProfile,
} from "./ConsumerProfile.util";

export class ConsumerProfileService {
	private static buildStatus(profile?: Partial<UserProfile> | null) {
		return buildConsumerProfileStatus(profile);
	}

	static async getProfile(userId: number): Promise<ApiResponse> {
		const user = await User.findById(userId);
		if (!user) {
			return { status: false, code: 404, message: "User not found" };
		}

		return {
			status: true,
			code: 200,
			message: "Consumer profile retrieved successfully",
			data: {
				profile: serializeConsumerProfile(user.userProfile),
				profileStatus: this.buildStatus(user.userProfile),
			},
		};
	}

	static async upsertProfile(userId: number, data: ConsumerProfileDTO): Promise<ApiResponse> {
		const user = await User.findById(userId);
		if (!user) {
			return { status: false, code: 404, message: "User not found" };
		}

		const current = user.userProfile;
		if (data.username && data.username !== current?.username) {
			const existingUsername = await User.findByUsername(data.username);
			if (existingUsername && existingUsername.id !== userId) {
				return { status: false, code: 400, message: "User name is taken. Please try again." };
			}
		}

		const houseNumber = data.houseNumber ?? current?.addressLine1;
		const streetName = data.streetName ?? current?.addressLine2;
		const localGovernmentArea = data.localGovernmentArea ?? current?.city;
		const state = data.state ?? current?.state;
		const derivedLocation = [houseNumber, streetName, localGovernmentArea, state].filter(Boolean).join(", ") || current?.location;
		const skippedSteps = getPersistedConsumerSkippedSteps({
			...(current?.toJSON?.() || current || {}),
			username: data.username ?? current?.username,
			phoneNumber: data.phoneNumber ?? current?.phoneNumber ?? user.phoneNumber,
			dateOfBirth: data.dateOfBirth ?? current?.dateOfBirth,
			addressLine1: houseNumber,
			addressLine2: streetName,
			city: localGovernmentArea,
			state,
			location: derivedLocation,
			profileImage: data.profileImage ?? current?.profileImage,
		});

		const merged = {
			username: data.username ?? current?.username,
			phoneNumber: data.phoneNumber ?? current?.phoneNumber ?? user.phoneNumber,
			dateOfBirth: data.dateOfBirth ?? current?.dateOfBirth,
			addressLine1: houseNumber,
			addressLine2: streetName,
			city: localGovernmentArea,
			state,
			location: derivedLocation,
			profileImage: data.profileImage ?? current?.profileImage,
			skippedSteps,
		};

		const profileStatus = this.buildStatus(merged);

		const profile = await UserProfile.createProfile(userId, {
			...merged,
			profileCompleted: profileStatus.profileCompleted,
			onboardingSkipped: Boolean(profileStatus.onboardingCompleted && !profileStatus.profileCompleted),
		});

		user.isProfileComplete = Boolean(profile.profileCompleted || profile.onboardingSkipped);
		await user.save();

		return {
			status: true,
			code: 200,
			message: "Consumer profile updated successfully",
			data: {
				profile: serializeConsumerProfile(profile),
				profileStatus: this.buildStatus(profile),
			},
		};
	}

	static async skipProfile(userId: number): Promise<ApiResponse> {
		const user = await User.findById(userId);
		if (!user) {
			return { status: false, code: 404, message: "User not found" };
		}

		const currentStep = getCurrentConsumerOnboardingStep(user.userProfile);
		if (!currentStep) {
			return {
				status: true,
				code: 200,
				message: "Consumer profile skipped successfully",
				data: {
					profile: serializeConsumerProfile(user.userProfile),
					profileStatus: this.buildStatus(user.userProfile),
				},
			};
		}

		const skippedSteps = Array.from(
			new Set([...(user.userProfile?.skippedSteps || []), currentStep])
		);
		const mergedProfile = {
			...(user.userProfile?.toJSON?.() || user.userProfile || {}),
			skippedSteps,
		};
		const profileStatus = this.buildStatus(mergedProfile);
		const profile = await UserProfile.createProfile(userId, {
			phoneNumber: user.userProfile?.phoneNumber ?? user.phoneNumber,
			skippedSteps,
			profileCompleted: profileStatus.profileCompleted,
			onboardingSkipped: Boolean(profileStatus.onboardingCompleted && !profileStatus.profileCompleted),
		});

		user.isProfileComplete = Boolean(profileStatus.onboardingCompleted);
		await user.save();

		return {
			status: true,
			code: 200,
			message: "Consumer profile skipped successfully",
			data: {
				profile: serializeConsumerProfile(profile),
				profileStatus: this.buildStatus(profile),
			},
		};
	}

	static async uploadProfileImage(userId: number, file: Express.Multer.File): Promise<ApiResponse> {
		const ext = file.originalname.includes(".") ? file.originalname.split(".").pop() : "jpg";
		const key = `consumer-profile/${userId}/${Date.now()}-${genAlphaNum(8)}.${ext}`;
		const uploader = new AwsUtil_s3();
		const result = await uploader.uploadBuffer(file.buffer, file.mimetype, key);

		const updateResponse = await this.upsertProfile(userId, { profileImage: result.location });
		if (!updateResponse.status) return updateResponse;

		return {
			status: true,
			code: 200,
			message: "Consumer profile image uploaded successfully",
			data: {
				...(updateResponse.data || {}),
				upload: {
					key: result.key,
					url: result.location,
				},
			},
		};
	}
}
