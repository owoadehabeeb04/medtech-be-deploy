import {
	AllowNull,
	BelongsTo,
	Column,
	DataType,
	Default,
	ForeignKey,
	Model,
	PrimaryKey,
	Table,
} from "sequelize-typescript";
import { DrugstoreCart } from "./DrugstoreCart.model";

@Table({
	tableName: "drugstore_cart_items",
	timestamps: true,
	indexes: [
		{ unique: true, fields: ["cart_id", "merchant_product_id"] },
		{ fields: ["merchant_id"] },
	],
})
export class DrugstoreCartItem extends Model<DrugstoreCartItem> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	declare id: string;

	@ForeignKey(() => DrugstoreCart)
	@AllowNull(false)
	@Column(DataType.UUID)
	declare cartId: string;

	@BelongsTo(() => DrugstoreCart)
	declare cart: DrugstoreCart;

	@AllowNull(false)
	@Column(DataType.UUID)
	declare merchantId: string;

	@AllowNull(false)
	@Column(DataType.UUID)
	declare merchantProductId: string;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare skuSnapshot: string | null;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare productNameSnapshot: string;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare brandSnapshot: string | null;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare categorySnapshot: string | null;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare imageUrlSnapshot: string | null;

	@AllowNull(false)
	@Column(DataType.DECIMAL(12, 2))
	declare unitPriceSnapshot: number;

	@AllowNull(false)
	@Default(0)
	@Column(DataType.DECIMAL(12, 2))
	declare vatSnapshot: number;

	@AllowNull(false)
	@Default(0)
	@Column(DataType.DECIMAL(5, 2))
	declare discountPercentageSnapshot: number;

	@AllowNull(false)
	@Default(1)
	@Column(DataType.INTEGER)
	declare minQuantitySnapshot: number;

	@AllowNull(false)
	@Default(100)
	@Column(DataType.INTEGER)
	declare maxQuantitySnapshot: number;

	@AllowNull(false)
	@Default(false)
	@Column(DataType.BOOLEAN)
	declare requiresPrescriptionSnapshot: boolean;

	@AllowNull(false)
	@Column(DataType.INTEGER)
	declare quantity: number;

	@AllowNull(false)
	@Column(DataType.DECIMAL(12, 2))
	declare lineSubtotal: number;

	@AllowNull(false)
	@Column(DataType.DECIMAL(12, 2))
	declare lineVatTotal: number;

	@AllowNull(false)
	@Column(DataType.DECIMAL(12, 2))
	declare lineDiscountTotal: number;

	@AllowNull(false)
	@Column(DataType.DECIMAL(12, 2))
	declare lineTotal: number;
}
