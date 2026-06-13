import {
	AllowNull,
	BelongsTo,
	Column,
	DataType,
	Default,
	ForeignKey,
	HasMany,
	Model,
	PrimaryKey,
	Table,
} from "sequelize-typescript";
import { User } from "../users/User.model";
import { DrugstoreCartItem } from "./DrugstoreCartItem.model";

@Table({
	tableName: "drugstore_carts",
	timestamps: true,
	indexes: [
		{ fields: ["user_id", "status"] },
		{ fields: ["merchant_id"] },
	],
})
export class DrugstoreCart extends Model<DrugstoreCart> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	declare id: string;

	@ForeignKey(() => User)
	@AllowNull(false)
	@Column(DataType.INTEGER)
	declare userId: number;

	@BelongsTo(() => User)
	declare user: User;

	@AllowNull(false)
	@Column(DataType.UUID)
	declare merchantId: string;

	@AllowNull(false)
	@Default("active")
	@Column(DataType.ENUM("active", "pending_checkout", "checked_out", "abandoned"))
	declare status: "active" | "pending_checkout" | "checked_out" | "abandoned";

	@AllowNull(false)
	@Default("NGN")
	@Column(DataType.STRING)
	declare currency: string;

	@AllowNull(false)
	@Default(0)
	@Column(DataType.DECIMAL(12, 2))
	declare subtotal: number;

	@AllowNull(false)
	@Default(0)
	@Column(DataType.DECIMAL(12, 2))
	declare vatTotal: number;

	@AllowNull(false)
	@Default(0)
	@Column(DataType.DECIMAL(12, 2))
	declare discountTotal: number;

	@AllowNull(false)
	@Default(0)
	@Column(DataType.DECIMAL(12, 2))
	declare grandTotal: number;

	@HasMany(() => DrugstoreCartItem)
	declare items: DrugstoreCartItem[];
}
