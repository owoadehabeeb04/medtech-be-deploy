import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

export type WebhookEventStatus = "received" | "processed" | "failed" | "ignored";

// Every callback from a payment provider is stored FIRST, then processed. That gives us a record of
// what was sent, protection against duplicate deliveries, and a way to retry a failed one.
// Unique (provider, dedupe_key) is created by the migration, not here.
@Table({
  tableName: "payment_webhook_events",
  timestamps: true,
})
export class PaymentWebhookEvent extends Model<PaymentWebhookEvent> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.STRING(20))
  declare provider: string;

  @AllowNull(false)
  @Column(DataType.STRING(60))
  declare eventType: string;

  // Collect: notificationId. Checkout: paymentReference + statusCode + timeStamp. Payout: reference + transactionId.
  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare dedupeKey: string;

  @AllowNull(true)
  @Column(DataType.STRING(100))
  declare reference: string | null;

  @AllowNull(false)
  @Column(DataType.JSONB)
  declare payload: Record<string, unknown>;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare signatureValid: boolean;

  @AllowNull(false)
  @Default("received")
  @Column(DataType.STRING(20))
  declare status: WebhookEventStatus;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  declare attempts: number;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare error: string | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare processedAt: Date | null;
}
