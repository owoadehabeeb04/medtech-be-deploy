import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table, Unique } from "sequelize-typescript";

export type DrugstoreSubcategory = {
	name: string;
	slug: string;
	imageUrl: string | null;
};

@Table({
	tableName: "drugstore_category_groups",
	timestamps: true,
})
export class DrugstoreCategoryGroup extends Model<DrugstoreCategoryGroup> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	declare id: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare name: string; // e.g. "Health & Wellness"

	@Unique(true)
	@AllowNull(false)
	@Column(DataType.STRING)
	declare slug: string;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare imageUrl: string | null;

	// Each entry's `name` should match the value stored in Product.category for products in this group.
	@AllowNull(false)
	@Default([])
	@Column(DataType.JSONB)
	declare subcategories: DrugstoreSubcategory[];

	@AllowNull(false)
	@Default(0)
	@Column(DataType.INTEGER)
	declare sortOrder: number;

	@AllowNull(false)
	@Default(true)
	@Column(DataType.BOOLEAN)
	declare isActive: boolean;
}
