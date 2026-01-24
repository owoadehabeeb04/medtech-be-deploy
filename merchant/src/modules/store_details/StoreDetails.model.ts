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
  tableName: "store_details",
  timestamps: true,
})
export class StoreDetails extends Model<StoreDetails> {
  @ForeignKey(() => Merchant)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare merchantId: string;

  @BelongsTo(() => Merchant)
  declare merchant: Merchant;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare businessName: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare businessUrl: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare licenseUrl: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare businessAddress: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare city: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare state: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare landmark: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare storeBannerUrl: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare storeDescription: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare openHour: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare closeHour: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare vacation: boolean;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare vacationStartDate: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare vacationEndDate: Date;
}
