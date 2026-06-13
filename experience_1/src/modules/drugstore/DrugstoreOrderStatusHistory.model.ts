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
import { DrugstoreOrder } from "./DrugstoreOrder.model";

@Table({
	tableName: "drugstore_order_status_history",
	timestamps: true,
	updatedAt: false,
	indexes: [{ fields: ["order_id"] }, { fields: ["status_type"] }],
})
export class DrugstoreOrderStatusHistory extends Model<DrugstoreOrderStatusHistory> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	declare id: string;

	@ForeignKey(() => DrugstoreOrder)
	@AllowNull(false)
	@Column(DataType.UUID)
	declare orderId: string;

	@BelongsTo(() => DrugstoreOrder)
	declare order: DrugstoreOrder;

	@AllowNull(false)
	@Column(DataType.ENUM("payment", "delivery", "sync"))
	declare statusType: "payment" | "delivery" | "sync";

	@AllowNull(true)
	@Column(DataType.STRING)
	declare fromStatus: string | null;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare toStatus: string;

	@AllowNull(false)
	@Column(DataType.ENUM("system", "user", "merchant", "webhook"))
	declare actorType: "system" | "user" | "merchant" | "webhook";

	@AllowNull(true)
	@Column(DataType.STRING)
	declare actorId: string | null;

	@AllowNull(true)
	@Column(DataType.TEXT)
	declare note: string | null;

	@AllowNull(true)
	@Column(DataType.JSONB)
	declare metadata: Record<string, unknown> | null;
}
