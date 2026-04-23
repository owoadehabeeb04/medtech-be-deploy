import {
	AllowNull,
	BelongsTo,
	Column,
	DataType,
	Default,
	ForeignKey,
	Model,
	Table,
	Unique,
} from "sequelize-typescript";
import { DrugstoreOrder } from "./DrugstoreOrder.model";

@Table({
	tableName: "drugstore_sync_events",
	timestamps: true,
	indexes: [
		{ fields: ["status", "next_retry_at"] },
		{ fields: ["order_id"] },
	],
})
export class DrugstoreSyncEvent extends Model<DrugstoreSyncEvent> {
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
	@Column(DataType.UUID)
	declare sourceOrderId: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare paymentReference: string;

	@Unique(true)
	@AllowNull(false)
	@Column(DataType.STRING)
	declare sourceSyncKey: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare payloadHash: string;

	@AllowNull(false)
	@Default("pending")
	@Column(DataType.ENUM("pending", "processing", "sent", "failed"))
	declare status: "pending" | "processing" | "sent" | "failed";

	@AllowNull(false)
	@Default(0)
	@Column(DataType.INTEGER)
	declare attempts: number;

	@AllowNull(true)
	@Column(DataType.DATE)
	declare nextRetryAt: Date | null;

	@AllowNull(true)
	@Column(DataType.TEXT)
	declare lastError: string | null;

	@AllowNull(false)
	@Column(DataType.JSONB)
	declare requestPayload: Record<string, unknown>;

	@AllowNull(true)
	@Column(DataType.JSONB)
	declare responsePayload: Record<string, unknown> | null;
}
