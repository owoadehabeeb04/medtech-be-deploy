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

@Table({
  tableName: "merchant_device_tokens",
  timestamps: true,
  indexes: [
    {
      name: "merchant_device_tokens_merchant_device_unique",
      unique: true,
      fields: ["merchant_id", "device_id"],
    },
    {
      name: "merchant_device_tokens_merchant_active_idx",
      fields: ["merchant_id", "is_active"],
    },
    {
      name: "merchant_device_tokens_token_idx",
      fields: ["token"],
    },
  ],
})
export class MerchantDeviceToken extends Model<MerchantDeviceToken> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Merchant)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare merchantId: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare deviceId: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare token: string;

  @AllowNull(false)
  @Default("web")
  @Column(DataType.STRING(20))
  declare platform: "web";

  @AllowNull(true)
  @Column(DataType.STRING(100))
  declare browser: string | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare userAgent: string | null;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  declare lastSeenAt: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare lastErrorAt: Date | null;

  @AllowNull(true)
  @Column(DataType.STRING(120))
  declare lastErrorCode: string | null;

  @BelongsTo(() => Merchant)
  declare merchant: Merchant;
}
