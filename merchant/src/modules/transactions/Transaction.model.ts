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
import { Wallet } from "../wallet/Wallet.model";
import { TransactionType, TransactionStatus, PaymentMethod } from "../../constants/enums";

@Table({
  tableName: "transactions",
  timestamps: true,
})
export class Transaction extends Model<Transaction> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Merchant)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare merchantId: string;

  @ForeignKey(() => Wallet)
  @AllowNull(true)
  @Column(DataType.UUID)
  declare walletId: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare type: string; // TransactionType

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare amount: number; // in kobo

  @AllowNull(false)
  @Default("NGN")
  @Column(DataType.STRING)
  declare currency: string;

  @AllowNull(false)
  @Default(TransactionStatus.PENDING)
  @Column(DataType.STRING)
  declare status: string; // TransactionStatus

  @AllowNull(false)
  @Column(DataType.STRING)
  declare paymentMethod: string; // PaymentMethod

  @AllowNull(true)
  @Unique
  @Column(DataType.STRING)
  declare paystackReference: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare description: string;

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare metadata: Record<string, any>;

  // Associations
  @BelongsTo(() => Merchant)
  declare merchant: Merchant;

  @BelongsTo(() => Wallet)
  declare wallet: Wallet;
}
