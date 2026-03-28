import { UserProfile } from "../user_profile/UserProfile.model";

export const CONSUMER_ONBOARDING_STEPS = [
	"consumer_username",
	"consumer_phone",
	"consumer_dob",
	"consumer_location",
	"consumer_profile_image",
] as const;

export type ConsumerOnboardingStep = (typeof CONSUMER_ONBOARDING_STEPS)[number];

type ConsumerProfileLike = Partial<UserProfile> & {
	skippedSteps?: string[] | null;
};

const normalizeSkippedSteps = (profile?: ConsumerProfileLike | null): ConsumerOnboardingStep[] => {
	const steps = Array.isArray(profile?.skippedSteps) ? profile?.skippedSteps : [];
	return steps.filter((step): step is ConsumerOnboardingStep =>
		CONSUMER_ONBOARDING_STEPS.includes(step as ConsumerOnboardingStep)
	);
};

const isLocationDone = (profile?: ConsumerProfileLike | null) =>
	Boolean(profile?.addressLine1 && profile?.addressLine2 && profile?.city && profile?.state);

const isStepDone = (step: ConsumerOnboardingStep, profile?: ConsumerProfileLike | null) => {
	switch (step) {
		case "consumer_username":
			return Boolean(profile?.username);
		case "consumer_phone":
			return Boolean(profile?.phoneNumber);
		case "consumer_dob":
			return Boolean(profile?.dateOfBirth);
		case "consumer_location":
			return isLocationDone(profile);
		case "consumer_profile_image":
			return Boolean(profile?.profileImage);
		default:
			return false;
	}
};

export const buildConsumerProfileStatus = (profile?: ConsumerProfileLike | null) => {
	const skippedSteps = normalizeSkippedSteps(profile);
	const nextStep =
		CONSUMER_ONBOARDING_STEPS.find((step) => !isStepDone(step, profile) && !skippedSteps.includes(step)) || null;
	const profileCompleted = CONSUMER_ONBOARDING_STEPS.every((step) => isStepDone(step, profile));
	const onboardingCompleted = nextStep === null;

	return {
		onboardingCompleted,
		profileCompleted,
		nextStep,
	};
};

export const getCurrentConsumerOnboardingStep = (profile?: ConsumerProfileLike | null): ConsumerOnboardingStep | null =>
	(buildConsumerProfileStatus(profile).nextStep as ConsumerOnboardingStep | null) || null;

export const getPersistedConsumerSkippedSteps = (profile?: ConsumerProfileLike | null): ConsumerOnboardingStep[] => {
	const skippedSteps = normalizeSkippedSteps(profile);
	return skippedSteps.filter((step) => !isStepDone(step, profile));
};

export const serializeConsumerProfile = (profile?: UserProfile | null) => {
	if (!profile) return null;

	return {
		userId: profile.userId,
		username: profile.username,
		phoneNumber: profile.phoneNumber,
		dateOfBirth: profile.dateOfBirth,
		location: profile.location,
		houseNumber: profile.addressLine1,
		streetName: profile.addressLine2,
		localGovernmentArea: profile.city,
		state: profile.state,
		profileImage: profile.profileImage,
		profileCompleted: profile.profileCompleted,
		onboardingSkipped: Boolean(profile.onboardingSkipped),
		skippedSteps: normalizeSkippedSteps(profile),
	};
};
