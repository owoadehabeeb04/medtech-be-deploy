import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Default,
  AllowNull,
  DeletedAt,
  Index,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
} from "sequelize-typescript";
import { Merchant } from "../merchant/Merchant.model";
import { DiscountType, DiscountStatus } from "../../constants/enums";

@Table({
  tableName: "discounts",
  timestamps: true,
  paranoid: true, // Enable soft delete
  indexes: [
    { fields: ["merchant_id"] },
    { fields: ["code"] },
    { fields: ["status"] },
    { fields: ["start_date", "end_date"] },
    { fields: ["deleted_at"] },
    { unique: true, fields: ["merchant_id", "code"], name: "unique_merchant_code" },
  ],
})
export class Discount extends Model<Discount> {
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

  // Code Information
  @AllowNull(false)
  @Index
  @Column(DataType.STRING(50))
  declare code: string; // e.g., "WELCOME10", "EASTER20"

  @AllowNull(false)
  @Column(DataType.ENUM(...Object.values(DiscountType)))
  declare type: DiscountType; // "fixed_amount" or "percentage"

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  declare amount: number; // ₦1000 for fixed or 10 for percentage

  // Applicability
  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  declare applyToAllProducts: boolean; // If true, applies to all products

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare applicableProducts: string[] | null; // Array of product IDs

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare applicableCategories: string[] | null; // Array of category names

  // Constraints
  @AllowNull(true)
  @Column(DataType.DECIMAL(10, 2))
  declare minOrderAmount: number | null; // Minimum cart value to use code

  // Status & Dates
  @AllowNull(false)
  @Default(DiscountStatus.ACTIVE)
  @Index
  @Column(DataType.ENUM(...Object.values(DiscountStatus)))
  declare status: DiscountStatus; // "active" or "inactive"

  @AllowNull(false)
  @Index
  @Column(DataType.DATEONLY)
  declare startDate: Date;

  @AllowNull(false)
  @Index
  @Column(DataType.DATEONLY)
  declare endDate: Date;

  // Usage Tracking
  @AllowNull(true)
  @Column(DataType.INTEGER)
  declare usageLimit: number | null; // Max total uses (null = unlimited)

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  declare usageCount: number; // Times used so far

  @AllowNull(true)
  @Column(DataType.INTEGER)
  declare perUserLimit: number | null; // Max uses per customer (optional)

  // Timestamps
  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  // Soft Delete
  @DeletedAt
  declare deletedAt: Date | null;

  // Computed Properties
  get isExpired(): boolean {
    const now = new Date();
    return now > this.endDate || now < this.startDate;
  }

  get isValid(): boolean {
    return (
      this.status === DiscountStatus.ACTIVE &&
      !this.isExpired &&
      (this.usageLimit === null || this.usageCount < this.usageLimit)
    );
  }

  get remainingUses(): number | null {
    if (this.usageLimit === null) return null;
    return Math.max(0, this.usageLimit - this.usageCount);
  }
}
