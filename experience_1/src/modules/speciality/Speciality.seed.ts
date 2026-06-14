import { Speciality } from "./Speciality.model";

const DEFAULT_SPECIALITIES: Array<{ name: string; key: string; isActive: boolean }> = [
	{ name: "cardiology", key: "cardiology", isActive: true },
	{ name: "dermatology", key: "dermatology", isActive: true },
	{ name: "endocrinology", key: "endocrinology", isActive: true },
	{ name: "family medicine", key: "family-medicine", isActive: true },
	{ name: "gastroenterology", key: "gastroenterology", isActive: true },
	{ name: "general practice", key: "general-practice", isActive: true },
	{ name: "gynecology", key: "gynecology", isActive: true },
	{ name: "neurology", key: "neurology", isActive: true },
	{ name: "orthopedics", key: "orthopedics", isActive: true },
	{ name: "pediatrics", key: "pediatrics", isActive: true },
];

export const ensureSpecialitySeedData = async (): Promise<void> => {
	const seedKeys = DEFAULT_SPECIALITIES.map((item) => item.key);
	const existingSpecialities = await Speciality.findAll({
		where: { key: seedKeys },
	});

	const existingKeys = new Set(existingSpecialities.map((item) => item.key));
	const missingSpecialities = DEFAULT_SPECIALITIES.filter((item) => !existingKeys.has(item.key));

	if (missingSpecialities.length === 0) {
		return;
	}

	await Speciality.bulkCreate(missingSpecialities);
};
