import {
  AllowNull,
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  Table,
  BelongsTo,
  PrimaryKey,
} from "sequelize-typescript";
import { Merchant } from "../merchant/Merchant.model";
import { Subscription } from "./Subscription.model";
import { Plan } from "./Plan.model";
import { ScheduledChangeStatus } from "../../constants/enums";

@Table({
  tableName: "scheduled_plan_changes",
  timestamps: true,
})
export class ScheduledPlanChange extends Model<ScheduledPlanChange> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Merchant)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare merchantId: string;

  @ForeignKey(() => Subscription)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare subscriptionId: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare fromPlanId: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare toPlanId: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare scheduledDate: Date;

  @AllowNull(false)
  @Default(ScheduledChangeStatus.PENDING)
  @Column(DataType.STRING)
  declare status: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare appliedAt: Date;

  // Associations
  @BelongsTo(() => Merchant)
  declare merchant: Merchant;

  @BelongsTo(() => Subscription)
  declare subscription: Subscription;

  @BelongsTo(() => Plan, "fromPlanId")
  declare fromPlan: Plan;

  @BelongsTo(() => Plan, "toPlanId")
  declare toPlan: Plan;
}
