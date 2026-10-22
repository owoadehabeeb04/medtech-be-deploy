import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

// A callback for a reference we cannot match to anything (or a success that cannot be applied).
// Kept so that money is never silently dropped; ops resolves it, or the reconciler does.
@Table({
  tableName: "unmatched_payments",
  timestamps: true,
})
export class UnmatchedPayment extends Model<UnmatchedPayment> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.STRING(20))
  declare provider: string;

  @AllowNull(true)
  @Column(DataType.STRING(100))
  declare reference: string | null;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  declare amountKobo: number | null;

  // e.g. unknown_reference, amount_mismatch, late_success, wrong_product
  @AllowNull(false)
  @Column(DataType.STRING(60))
  declare reason: string;

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare payload: Record<string, unknown> | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare resolvedAt: Date | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare resolution: string | null;
}
