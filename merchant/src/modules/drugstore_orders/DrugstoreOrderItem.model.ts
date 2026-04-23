import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Index,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";
import { DrugstoreOrder } from "./DrugstoreOrder.model";

@Table({
  tableName: "merchant_drugstore_order_items",
  timestamps: true,
  indexes: [{ fields: ["order_id"] }, { fields: ["merchant_product_id"] }],
})
export class DrugstoreOrderItem extends Model<DrugstoreOrderItem> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => DrugstoreOrder)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare orderId: string;

  @BelongsTo(() => DrugstoreOrder)
  declare order: DrugstoreOrder;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare merchantProductId: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare skuSnapshot: string | null;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare productNameSnapshot: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare descriptionSnapshot: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare brandSnapshot: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare categorySnapshot: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare imageUrlSnapshot: string | null;

  @AllowNull(false)
  @Column(DataType.DECIMAL(12, 2))
  declare unitPriceSnapshot: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(12, 2))
  declare vatSnapshot: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(5, 2))
  declare discountPercentageSnapshot: number;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare requiresPrescriptionSnapshot: boolean;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare quantity: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(12, 2))
  declare lineSubtotal: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(12, 2))
  declare lineVatTotal: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(12, 2))
  declare lineDiscountTotal: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(12, 2))
  declare lineTotal: number;
}
