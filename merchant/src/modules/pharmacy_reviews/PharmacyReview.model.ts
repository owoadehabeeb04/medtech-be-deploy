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
import { Merchant } from "../merchant/Merchant.model";

// Indexes (unique order_id, merchant_id + created_at) are created by the migration in core/migrations.ts.
// A consumer's review of a pharmacy, written from the consumer app (experience_1) after a
// delivered order and answered by the merchant from the merchant app.
@Table({
  tableName: "pharmacy_reviews",
  timestamps: true,
})
export class PharmacyReview extends Model<PharmacyReview> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Merchant)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare merchantId: string;

  @BelongsTo(() => Merchant)
  declare merchant: Merchant;

  // experience_1 order id — one review per order
  @AllowNull(false)
  @Column(DataType.STRING(64))
  declare orderId: string;

  @AllowNull(false)
  @Column(DataType.STRING(64))
  declare consumerId: string;

  @AllowNull(false)
  @Column(DataType.STRING(120))
  declare consumerName: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare rating: number;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare comment: string | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare reply: string | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare repliedAt: Date | null;
}
