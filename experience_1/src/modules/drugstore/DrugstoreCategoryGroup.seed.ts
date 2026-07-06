import { DrugstoreCategoryGroup, DrugstoreSubcategory } from "./DrugstoreCategoryGroup.model";

const sub = (name: string): DrugstoreSubcategory => ({
	name,
	slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
	imageUrl: null,
});

type SeedGroup = { name: string; slug: string; imageUrl: string | null; sortOrder: number; subcategories: DrugstoreSubcategory[] };

const DEFAULT_CATEGORY_GROUPS: SeedGroup[] = [
	{
		name: "Health & Wellness",
		slug: "health-wellness",
		imageUrl: null,
		sortOrder: 1,
		subcategories: [
			sub("Antibiotics"),
			sub("Antimalaria"),
			sub("Vitamins & Nutrition"),
			sub("Pain Relief"),
			sub("Common Symptoms"),
			sub("Respiratory Medications"),
			sub("Specialty Medications"),
			sub("Eye and Ear Care"),
			sub("Cardiovascular Medications"),
			sub("Diabetes Care"),
		],
	},
	{
		name: "Mother & Baby",
		slug: "mother-baby",
		imageUrl: null,
		sortOrder: 2,
		subcategories: [sub("Prenatal Vitamins"), sub("Baby Care"), sub("Feeding & Nursing"), sub("Maternal Health")],
	},
	{
		name: "Men Care",
		slug: "men-care",
		imageUrl: null,
		sortOrder: 3,
		subcategories: [sub("Men's Health"), sub("Grooming"), sub("Sexual Wellness")],
	},
	{
		name: "Women Care",
		slug: "women-care",
		imageUrl: null,
		sortOrder: 4,
		subcategories: [sub("Women's Health"), sub("Feminine Hygiene"), sub("Sexual Wellness")],
	},
	{
		name: "Elderly Care",
		slug: "elderly-care",
		imageUrl: null,
		sortOrder: 5,
		subcategories: [sub("Mobility Aids"), sub("Incontinence Care"), sub("Cardiovascular Medications"), sub("Diabetes Care")],
	},
	{
		name: "Medical",
		slug: "medical",
		imageUrl: null,
		sortOrder: 6,
		subcategories: [sub("First Aid"), sub("Medical Devices"), sub("Test Kits")],
	},
];

export const ensureDrugstoreCategoryGroupSeedData = async (): Promise<void> => {
	const seedSlugs = DEFAULT_CATEGORY_GROUPS.map((item) => item.slug);
	const existingGroups = await DrugstoreCategoryGroup.findAll({ where: { slug: seedSlugs } });

	const existingSlugs = new Set(existingGroups.map((item) => item.slug));
	const missingGroups = DEFAULT_CATEGORY_GROUPS.filter((item) => !existingSlugs.has(item.slug));

	if (missingGroups.length === 0) {
		return;
	}

	await DrugstoreCategoryGroup.bulkCreate(missingGroups as any);
};
