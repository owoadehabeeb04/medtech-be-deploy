import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  Default,
  HasMany,
  Index,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from "sequelize-typescript";
import { DrugstoreOrderItem } from "./DrugstoreOrderItem.model";

@Table({
  tableName: "merchant_drugstore_orders",
  timestamps: true,
  indexes: [
    { fields: ["merchant_id"] },
    { fields: ["source_order_id"], unique: true },
    { fields: ["source_sync_key"], unique: true },
    { fields: ["payment_verified_at"] },
    { fields: ["payment_status"] },
    { fields: ["delivery_status"] },
    { fields: ["placed_at"] },
    { fields: ["status"] },
  ],
})
export class DrugstoreOrder extends Model<DrugstoreOrder> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare merchantId: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare sourceOrderId: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare sourceSyncKey: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare paymentReference: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare sourceUserId: number;

  @AllowNull(false)
  @Column(DataType.ENUM("consumer", "doctor"))
  declare sourceUserRole: "consumer" | "doctor";

  @AllowNull(false)
  @Column(DataType.DATE)
  declare paymentVerifiedAt: Date;

  @AllowNull(false)
  @Default("paid")
  @Column(DataType.ENUM("pending", "paid", "failed"))
  declare paymentStatus: "pending" | "paid" | "failed";

  @AllowNull(false)
  @Default("pending")
  @Column(DataType.ENUM("pending", "picked_up", "in_transit", "delivered", "cancelled"))
  declare deliveryStatus: "pending" | "picked_up" | "in_transit" | "delivered" | "cancelled";

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  declare placedAt: Date;

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
  @Column(DataType.DECIMAL(12, 2))
  declare deliveryFee: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(12, 2))
  declare totalAmount: number;

  @AllowNull(false)
  @Default("NGN")
  @Column(DataType.STRING)
  declare currency: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare discountCode: string | null;

  @AllowNull(true)
  @Column(DataType.UUID)
  declare discountId: string | null;

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

  @AllowNull(true)
  @Column(DataType.DATEONLY)
  declare deliveryDate: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare deliveryTimeSlot: string | null;

  @AllowNull(false)
  @Default("new")
  @Column(DataType.ENUM("new", "processing", "ready", "delivered", "cancelled"))
  declare status: "new" | "processing" | "ready" | "delivered" | "cancelled";

  @AllowNull(false)
  @Default({})
  @Column(DataType.JSONB)
  declare metadata: Record<string, unknown>;

  @HasMany(() => DrugstoreOrderItem)
  declare items: DrugstoreOrderItem[];

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
