import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Default,
  AllowNull,
  DeletedAt,
  Index,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
} from "sequelize-typescript";
import { Merchant } from "../merchant/Merchant.model";
import { ProductStatus } from "../../constants/enums";

interface ProductImage {
  url: string;
  order: number;
  isMain: boolean;
}

@Table({
  tableName: "products",
  timestamps: true,
  paranoid: true, // Enable soft delete
  indexes: [
    { fields: ["merchant_id"] },
    { fields: ["category"] },
    { fields: ["status"] },
    { fields: ["is_active"] },
    { fields: ["deleted_at"] },
  ],
})
export class Product extends Model<Product> {
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

  // Product Information
  @AllowNull(false)
  @Index
  @Column(DataType.STRING(255))
  declare name: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare description: string;

  @AllowNull(false)
  @Index
  @Column(DataType.STRING(100))
  declare category: string; // "Antibiotics", "Vitamins & Nutrition", etc.

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare brand: string; // "GSK", "Pfizer", etc.

  @AllowNull(true)
  @Index
  @Column(DataType.STRING(100))
  declare sku: string; // Optional merchant SKU

  // Pricing
  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  declare price: number; // Base price

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  declare vat: number; // VAT amount (7.5% in Nigeria or custom)

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(5, 2))
  declare discountPercentage: number; // Product-level discount (0-100)

  // Order Limits
  @AllowNull(false)
  @Default(1)
  @Column(DataType.INTEGER)
  declare minQuantity: number; // Minimum order quantity

  @AllowNull(false)
  @Default(100)
  @Column(DataType.INTEGER)
  declare maxQuantity: number; // Maximum order quantity

  // Inventory
  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  declare inventory: number; // Stock quantity

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  declare purchaseCount: number; // Cumulative units sold across paid orders — powers "top selling"

  @AllowNull(false)
  @Default(ProductStatus.OUT_OF_STOCK)
  @Index
  @Column(DataType.ENUM(...Object.values(ProductStatus)))
  declare status: ProductStatus;

  // Images (JSONB array, first image is main)
  @AllowNull(false)
  @Default([])
  @Column(DataType.JSONB)
  declare images: ProductImage[];

  // Status Flags
  @AllowNull(false)
  @Default(true)
  @Index
  @Column(DataType.BOOLEAN)
  declare isActive: boolean; // Merchant can deactivate without deleting

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare requiresPrescription: boolean;

  // Timestamps
  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  // Soft Delete
  @DeletedAt
  declare deletedAt: Date | null;

  // Computed Properties
  get mainImage(): string | null {
    return this.images && this.images.length > 0 ? this.images[0].url : null;
  }

  get discountedPrice(): number {
    return this.price * (1 - this.discountPercentage / 100);
  }

  get totalPrice(): number {
    return this.discountedPrice + this.vat;
  }

  get isLowStock(): boolean {
    // Will be calculated based on merchant settings
    return this.status === ProductStatus.LOW_STOCK;
  }

  get isOutOfStock(): boolean {
    return this.inventory === 0 || this.status === ProductStatus.OUT_OF_STOCK;
  }
}
