import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

@Table({
  tableName: "merchant_audit_logs",
  timestamps: true,
  updatedAt: false,
})
export class MerchantAuditLog extends Model<MerchantAuditLog> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare merchantId: string;

  @AllowNull(false)
  @Column(DataType.STRING(20))
  declare actorType: "owner" | "member";

  // member id for staff, the merchant id for the owner
  @AllowNull(false)
  @Column(DataType.STRING(64))
  declare actorId: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare actorName: string | null;

  @AllowNull(false)
  @Column(DataType.STRING(120))
  declare action: string;

  @AllowNull(true)
  @Column(DataType.STRING(64))
  declare entityId: string | null;

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare metadata: Record<string, unknown> | null;
}
