import {
  AllowNull,
  Column,
  DataType,
  Default,
  Model,
  Table,
  Unique,
  PrimaryKey,
  HasMany,
} from "sequelize-typescript";
import { PlanTier, PayoutFrequency, SupportTier, PerformanceSummaryLevel } from "../../constants/enums";

@Table({
  tableName: "plans",
  timestamps: true,
})
export class Plan extends Model<Plan> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  declare name: string; // PlanTier value

  @AllowNull(false)
  @Column(DataType.STRING)
  declare displayName: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare description: string;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  declare price: number; // in kobo (₦1 = 100 kobo)

  @AllowNull(true)
  @Column(DataType.INTEGER)
  declare maxProductListings: number | null; // null = unlimited

  @AllowNull(false)
  @Default(PayoutFrequency.NONE)
  @Column(DataType.STRING)
  declare payoutFrequency: string;

  @AllowNull(false)
  @Default(SupportTier.STANDARD)
  @Column(DataType.STRING)
  declare supportTier: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare hasPrescriptionMatching: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare hasHigherProductVisibility: boolean;

  @AllowNull(false)
  @Default(PerformanceSummaryLevel.NONE)
  @Column(DataType.STRING)
  declare performanceSummaryLevel: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare hasEarlyAccess: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isPopular: boolean;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  declare sortOrder: number;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  // JSON array of feature display strings for the UI
  @AllowNull(true)
  @Default([])
  @Column(DataType.JSONB)
  declare features: string[];
}
