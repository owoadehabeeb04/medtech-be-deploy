import { randomUUID } from "crypto";
import { PaymentWebhookEvent } from "./PaymentWebhookEvent.model";

export interface RecordEventInput {
  provider: string;
  eventType: string;
  dedupeKey: string;
  reference?: string | null;
  payload: Record<string, unknown>;
  signatureValid: boolean;
}

export class PaymentEventService {
  /**
   * Store an incoming callback exactly once. A second delivery of the same event (Paga retries up to 3
   * times) returns the existing row with `duplicate: true` instead of creating another.
   */
  static async record(input: RecordEventInput): Promise<{ event: PaymentWebhookEvent; duplicate: boolean }> {
    // A callback that fails the signature check is kept for review but must never occupy the dedupe key,
    // or a forged copy would make the genuine one look like a duplicate and be skipped.
    const dedupeKey = input.signatureValid ? input.dedupeKey : `unverified:${randomUUID()}`;
    try {
      const event = await PaymentWebhookEvent.create({
        provider: input.provider,
        eventType: input.eventType,
        dedupeKey,
        reference: input.reference || null,
        payload: input.payload,
        signatureValid: input.signatureValid,
        status: "received",
        attempts: 0,
      });
      return { event, duplicate: false };
    } catch (error: any) {
      if (error?.name !== "SequelizeUniqueConstraintError") throw error;
      const existing = await PaymentWebhookEvent.findOne({ where: { provider: input.provider, dedupeKey } });
      if (!existing) throw error;
      return { event: existing, duplicate: true };
    }
  }

  /** Only events that have not been processed successfully should be processed (again). */
  static shouldProcess(event: PaymentWebhookEvent): boolean {
    return event.signatureValid && (event.status === "received" || event.status === "failed");
  }

  static async markProcessed(eventId: string): Promise<void> {
    await PaymentWebhookEvent.update({ status: "processed", processedAt: new Date(), error: null }, { where: { id: eventId } });
  }

  static async markIgnored(eventId: string, reason: string): Promise<void> {
    await PaymentWebhookEvent.update({ status: "ignored", processedAt: new Date(), error: reason }, { where: { id: eventId } });
  }

  /** Failed events stay retryable: the next delivery (or the reconciler) processes them again. */
  static async markFailed(eventId: string, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    const event = await PaymentWebhookEvent.findByPk(eventId);
    if (!event) return;
    await event.update({ status: "failed", attempts: event.attempts + 1, error: message.slice(0, 2000) });
  }
}
