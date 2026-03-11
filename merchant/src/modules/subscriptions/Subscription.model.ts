import {
  AllowNull,
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  Table,
  BelongsTo,
  Unique,
  PrimaryKey,
  HasMany,
} from "sequelize-typescript";
import { Merchant } from "../merchant/Merchant.model";
import { Plan } from "./Plan.model";
import { SubscriptionStatus } from "../../constants/enums";

@Table({
  tableName: "subscriptions",
  timestamps: true,
})
export class Subscription extends Model<Subscription> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Merchant)
  @AllowNull(false)
  @Unique
  @Column(DataType.UUID)
  declare merchantId: string;

  @ForeignKey(() => Plan)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare planId: string;

  @AllowNull(false)
  @Default(SubscriptionStatus.ACTIVE)
  @Column(DataType.STRING)
  declare status: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare paystackSubscriptionCode: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare paystackCustomerCode: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare paystackEmailToken: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare currentPeriodStart: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare currentPeriodEnd: Date;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  declare autoRenew: boolean;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare cancelledAt: Date;

  // Associations
  @BelongsTo(() => Merchant)
  declare merchant: Merchant;

  @BelongsTo(() => Plan)
  declare plan: Plan;
}
