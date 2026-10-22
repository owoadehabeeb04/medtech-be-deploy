import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

// One row per client-supplied Idempotency-Key and scope (e.g. "merchant:<id>:withdraw").
// Unique (scope, key) is created by the migration, not here.
@Table({
  tableName: "idempotency_keys",
  timestamps: true,
})
export class IdempotencyKey extends Model<IdempotencyKey> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.STRING(120))
  declare scope: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare key: string;

  // SHA-256 of the request body, so the same key with a different body is rejected
  @AllowNull(false)
  @Column(DataType.STRING(64))
  declare requestHash: string;

  @AllowNull(false)
  @Default("in_progress")
  @Column(DataType.STRING(20))
  declare status: "in_progress" | "completed";

  @AllowNull(true)
  @Column(DataType.INTEGER)
  declare responseStatus: number | null;

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare responseBody: unknown;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare expiresAt: Date;
}
