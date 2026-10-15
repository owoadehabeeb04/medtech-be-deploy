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
import { MerchantRole } from "./MerchantRole.model";

@Table({
  tableName: "merchant_invitations",
  timestamps: true,
})
export class MerchantInvitation extends Model<MerchantInvitation> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Merchant)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare merchantId: string;

  @BelongsTo(() => Merchant)
  declare pharmacy: Merchant;

  // always stored lower-case
  @AllowNull(false)
  @Column(DataType.STRING)
  declare email: string;

  @ForeignKey(() => MerchantRole)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare roleId: string;

  @BelongsTo(() => MerchantRole)
  declare role: MerchantRole;

  // SHA-256 of the token that was emailed; the token itself is never stored
  @AllowNull(false)
  @Column(DataType.STRING(64))
  declare tokenHash: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare expiresAt: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare acceptedAt: Date | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare revokedAt: Date | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare invitedBy: string | null;
}
