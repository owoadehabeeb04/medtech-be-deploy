import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Index,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from "sequelize-typescript";

@Table({
  tableName: "product_categories",
  timestamps: true,
  indexes: [
    { unique: true, fields: ["category_key"], name: "product_categories_key_unique" },
    { fields: ["parent_id", "sort_order"] },
    { fields: ["name"] },
    { fields: ["is_active"] },
    { fields: ["is_selectable"] },
  ],
})
export class ProductCategory extends Model<ProductCategory> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Index
  @Column({ field: "category_key", type: DataType.STRING(180) })
  declare key: string;

  @AllowNull(false)
  @Index
  @Column(DataType.STRING(150))
  declare name: string;

  @ForeignKey(() => ProductCategory)
  @AllowNull(true)
  @Index
  @Column({ field: "parent_id", type: DataType.UUID })
  declare parentId: string | null;

  @BelongsTo(() => ProductCategory, "parentId")
  declare parent: ProductCategory | null;

  @HasMany(() => ProductCategory, "parentId")
  declare children: ProductCategory[];

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  declare sortOrder: number;

  @AllowNull(false)
  @Default(true)
  @Index
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  @AllowNull(false)
  @Default(false)
  @Index
  @Column(DataType.BOOLEAN)
  declare isSelectable: boolean;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
