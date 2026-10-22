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

// A role belongs to one pharmacy. The pharmacy chooses its name and which catalog permissions it holds.
// Unique (merchant_id, lower(name)) is enforced by the migration.
@Table({
  tableName: "merchant_roles",
  timestamps: true,
})
export class MerchantRole extends Model<MerchantRole> {
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

  @AllowNull(false)
  @Column(DataType.STRING(80))
  declare name: string;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  declare description: string | null;

  // Array of permission keys from constants/permissions.ts
  @AllowNull(false)
  @Default([])
  @Column(DataType.JSONB)
  declare permissions: string[];
}
