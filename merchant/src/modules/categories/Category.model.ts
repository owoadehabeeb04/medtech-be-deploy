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
  Unique,
} from "sequelize-typescript";
import { Merchant } from "../merchant/Merchant.model";

@Table({
  tableName: "categories",
  timestamps: true,
  paranoid: true, // Enable soft delete
  indexes: [
    { fields: ["merchant_id"] },
    { fields: ["name"] },
    { fields: ["deleted_at"] },
    { unique: true, fields: ["merchant_id", "name"], name: "unique_merchant_category" },
  ],
})
export class Category extends Model<Category> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Merchant)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare merchantId: string;

  @BelongsTo(() => Merchant)
  declare merchant: Merchant;

  @AllowNull(false)
  @Index
  @Column(DataType.STRING(100))
  declare name: string; // Category name (e.g., "Antibiotics", "Pain Relief")

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare description: string; // Optional description

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isDefault: boolean; // True for pre-populated categories (Antibiotics, Pain Relief)

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean; // Merchant can deactivate without deleting

  // Timestamps
  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  // Soft Delete
  @DeletedAt
  declare deletedAt: Date | null;

  /**
   * Seed default categories for a new merchant
   */
  static async seedDefaultCategories(merchantId: string): Promise<void> {
    const defaultCategories = [
      { name: "Antibiotics", description: "Antibiotic medications", isDefault: true },
      { name: "Pain Relief", description: "Pain relief medications", isDefault: true },
    ];

    for (const categoryData of defaultCategories) {
      await this.findOrCreate({
        where: {
          merchantId,
          name: categoryData.name,
        },
        defaults: {
          merchantId,
          name: categoryData.name,
          description: categoryData.description,
          isDefault: categoryData.isDefault,
          isActive: true,
        },
      });
    }
  }
}
