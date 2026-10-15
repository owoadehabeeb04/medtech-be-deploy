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
import { StaffAccount } from "./StaffAccount.model";
import { MerchantRole } from "./MerchantRole.model";

// removed = soft delete: access is gone but the row (and its history) is kept, and a new invitation restores it
export type MemberStatus = "active" | "suspended" | "removed";

// One person at one pharmacy. The person is either a staff account, or an owner of a DIFFERENT
// pharmacy (ownerMerchantId) — exactly one of the two is set (checked in the migration).
@Table({
  tableName: "merchant_members",
  timestamps: true,
})
export class MerchantMember extends Model<MerchantMember> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  // the pharmacy they work at
  @ForeignKey(() => Merchant)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare merchantId: string;

  @BelongsTo(() => Merchant, "merchantId")
  declare pharmacy: Merchant;

  @ForeignKey(() => StaffAccount)
  @AllowNull(true)
  @Column(DataType.UUID)
  declare staffAccountId: string | null;

  @BelongsTo(() => StaffAccount)
  declare staffAccount: StaffAccount | null;

  // set instead of staffAccountId when the person owns another pharmacy
  @ForeignKey(() => Merchant)
  @AllowNull(true)
  @Column(DataType.UUID)
  declare ownerMerchantId: string | null;

  @BelongsTo(() => Merchant, "ownerMerchantId")
  declare ownerMerchant: Merchant | null;

  // null only for a removed member whose role was deleted afterwards
  @ForeignKey(() => MerchantRole)
  @AllowNull(true)
  @Column(DataType.UUID)
  declare roleId: string | null;

  @BelongsTo(() => MerchantRole)
  declare role: MerchantRole | null;

  @AllowNull(false)
  @Default("active")
  @Column(DataType.STRING(20))
  declare status: MemberStatus;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare invitedBy: string | null;

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  declare joinedAt: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare removedAt: Date | null;
}
