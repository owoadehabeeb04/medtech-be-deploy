import {
  AllowNull,
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  Table,
  BelongsTo,
} from "sequelize-typescript";
import { Merchant } from "../merchant/Merchant.model";

@Table({
  tableName: "payment_details",
  timestamps: true,
})
export class PaymentDetails extends Model<PaymentDetails> {
  @ForeignKey(() => Merchant)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare merchantId: string;

  @BelongsTo(() => Merchant)
  declare merchant: Merchant;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare bankName: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare bankCode: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare bankAccountNumber: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare bankAccountName: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare bankVerified: boolean;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare verifiedAt: Date;
}
