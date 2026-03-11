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
} from "sequelize-typescript";
import { Merchant } from "../merchant/Merchant.model";

@Table({
  tableName: "wallets",
  timestamps: true,
})
export class Wallet extends Model<Wallet> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Merchant)
  @AllowNull(false)
  @Unique
  @Column(DataType.UUID)
  declare merchantId: string;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  declare balance: number; // in kobo (₦1 = 100 kobo)

  @AllowNull(false)
  @Default("NGN")
  @Column(DataType.STRING)
  declare currency: string;

  // Associations
  @BelongsTo(() => Merchant)
  declare merchant: Merchant;
}
