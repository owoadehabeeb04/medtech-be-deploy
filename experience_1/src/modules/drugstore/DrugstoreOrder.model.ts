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
	Unique,
} from "sequelize-typescript";
import { User } from "../users/User.model";
import { DrugstoreOrderItem } from "./DrugstoreOrderItem.model";
import { DrugstoreOrderStatusHistory } from "./DrugstoreOrderStatusHistory.model";
import { DrugstoreSyncEvent } from "./DrugstoreSyncEvent.model";
import { DrugstoreCart } from "./DrugstoreCart.model";
import { DrugstoreAddress } from "./DrugstoreAddress.model";
import { DrugstorePrescription } from "./DrugstorePrescription.model";

@Table({
	tableName: "drugstore_orders",
	timestamps: true,
	indexes: [
		{ fields: ["user_id"] },
		{ fields: ["merchant_id"] },
		{ fields: ["payment_status"] },
		{ fields: ["delivery_status"] },
		{ fields: ["merchant_sync_status"] },
	],
})
export class DrugstoreOrder extends Model<DrugstoreOrder> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	declare id: string;

	@Unique(true)
	@AllowNull(false)
	@Column(DataType.UUID)
	declare sourceOrderId: string;

	@ForeignKey(() => User)
	@AllowNull(false)
	@Column(DataType.INTEGER)
	declare userId: number;

	@BelongsTo(() => User)
	declare user: User;

	@ForeignKey(() => DrugstoreCart)
	@AllowNull(true)
	@Column(DataType.UUID)
	declare cartId: string | null;

	@BelongsTo(() => DrugstoreCart)
	declare cart: DrugstoreCart;

	@AllowNull(false)
	@Column(DataType.ENUM("consumer", "doctor"))
	declare userRoleSnapshot: "consumer" | "doctor";

	@AllowNull(false)
	@Column(DataType.UUID)
	declare merchantId: string;

	@AllowNull(true)
	@Column(DataType.UUID)
	declare merchantOrderId: string | null;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare paymentMethod: string;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare paymentReference: string | null;

	@AllowNull(false)
	@Default("pending")
	@Column(DataType.ENUM("pending", "paid", "failed"))
	declare paymentStatus: "pending" | "paid" | "failed";

	@AllowNull(true)
	@Column(DataType.DATE)
	declare paymentVerifiedAt: Date | null;

	@AllowNull(false)
	@Default("pending")
	@Column(DataType.ENUM("pending", "picked_up", "in_transit", "delivered", "cancelled"))
	declare deliveryStatus: "pending" | "picked_up" | "in_transit" | "delivered" | "cancelled";

	@AllowNull(false)
	@Default("pending")
	@Column(DataType.ENUM("pending", "synced", "failed"))
	declare merchantSyncStatus: "pending" | "synced" | "failed";

	@Unique(true)
	@AllowNull(true)
	@Column(DataType.STRING)
	declare merchantSyncKey: string | null;

	@AllowNull(false)
	@Default(0)
	@Column(DataType.INTEGER)
	declare merchantSyncAttempts: number;

	@AllowNull(true)
	@Column(DataType.DATE)
	declare merchantSyncedAt: Date | null;

	@AllowNull(true)
	@Column(DataType.TEXT)
	declare merchantSyncLastError: string | null;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare discountCode: string | null;

	@AllowNull(true)
	@Column(DataType.UUID)
	declare discountIdSnapshot: string | null;

	@ForeignKey(() => DrugstoreAddress)
	@AllowNull(true)
	@Column(DataType.UUID)
	declare addressId: string | null;

	@BelongsTo(() => DrugstoreAddress)
	declare address: DrugstoreAddress;

	@ForeignKey(() => DrugstorePrescription)
	@AllowNull(true)
	@Column(DataType.UUID)
	declare prescriptionId: string | null;

	@BelongsTo(() => DrugstorePrescription)
	declare prescription: DrugstorePrescription;

	@AllowNull(false)
	@Column(DataType.DECIMAL(12, 2))
	declare subtotal: number;

	@AllowNull(false)
	@Column(DataType.DECIMAL(12, 2))
	declare vatTotal: number;

	@AllowNull(false)
	@Column(DataType.DECIMAL(12, 2))
	declare discountTotal: number;

	@AllowNull(false)
	@Default(0)
	@Column(DataType.DECIMAL(12, 2))
	declare deliveryFee: number;

	@AllowNull(false)
	@Column(DataType.DECIMAL(12, 2))
	declare totalAmount: number;

	@AllowNull(false)
	@Default("NGN")
	@Column(DataType.STRING)
	declare currency: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare recipientName: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare recipientPhone: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare addressLine1: string;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare addressLine2: string | null;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare city: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare state: string;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare landmark: string | null;

	@AllowNull(true)
	@Column(DataType.TEXT)
	declare deliveryNote: string | null;

	@AllowNull(false)
	@Column(DataType.DATE)
	declare placedAt: Date;

	@AllowNull(true)
	@Column(DataType.DATEONLY)
	declare deliveryDate: string | null;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare deliveryTimeSlot: string | null;

	@AllowNull(true)
	@Column(DataType.DATE)
	declare cancelledAt: Date | null;

	@HasMany(() => DrugstoreOrderItem)
	declare items: DrugstoreOrderItem[];

	@HasMany(() => DrugstoreOrderStatusHistory)
	declare statusHistory: DrugstoreOrderStatusHistory[];

	@HasMany(() => DrugstoreSyncEvent)
	declare syncEvents: DrugstoreSyncEvent[];
}
