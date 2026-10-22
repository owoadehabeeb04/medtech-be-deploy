import { PagaConfig, resolveUrls, DEFAULT_TIMEOUT_MS } from "./config";
import { PagaError } from "./errors";
import { pagaHash } from "./hash";
import { koboToNairaNumber, koboToNairaString, safeNairaToKobo } from "./money";
import { fetchTransport } from "./transport";

/**
 * Collect API: status, banks, history and refunds (formulas verified in the docs).
 * Direct debit mandate operations are added with the subscription work, once their exact hashes are confirmed.
 */
export class PagaCollectClient {
  constructor(private readonly config: PagaConfig) {}

  private async call(path: string, body: { [key: string]: unknown }, hashParts: Array<string | number | null | undefined>) {
    const transport = this.config.transport || fetchTransport;
    // UNCONFIRMED: Basic auth content is not stated; publicKey:secretKey is the standard form.
    const credentials = Buffer.from(this.config.publicKey + ":" + this.config.secretKey, "utf8").toString("base64");

    const response = await transport({
      method: "POST",
      url: resolveUrls(this.config).collect + path,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: "Basic " + credentials,
        hash: pagaHash(hashParts, this.config.hashKey),
      },
      body,
      timeoutMs: this.config.timeoutMs || DEFAULT_TIMEOUT_MS,
    });

    if (response.status >= 500) {
      throw new PagaError("Paga Collect API error (" + response.status + ")", { kind: "network", httpStatus: response.status, outcomeUnknown: true });
    }
    if (!response.body || typeof response.body !== "object") {
      throw new PagaError("Unreadable response from Paga", { kind: "invalid_response", httpStatus: response.status, outcomeUnknown: true });
    }
    // The docs show some responses nested under `data`
    return response.body.data && typeof response.body.data === "object" && response.body.statusCode === undefined
      ? { ...response.body.data, ...response.body }
      : response.body;
  }

  /** Status of a payment request by our reference (also reports refundStatus). */
  async status(referenceNumber: string) {
    const body = await this.call("/status", { referenceNumber }, [referenceNumber]);
    return {
      statusCode: Number(body.statusCode),
      statusMessage: body.statusMessage as string,
      requestAmountKobo: safeNairaToKobo(body.requestAmount),
      totalPaymentAmountKobo: safeNairaToKobo(body.totalPaymentAmount),
      refundStatus: (body.refundStatus as string) || null,
    };
  }

  async banks(referenceNumber: string) {
    const body = await this.call("/banks", { referenceNumber }, [referenceNumber]);
    return {
      statusCode: Number(body.statusCode),
      banks: (Array.isArray(body.banks) ? body.banks : []).map((bank: any) => ({
        uuid: bank.uuid as string,
        name: bank.name as string,
        sortCode: (bank.sortCode as string) || null,
      })),
    };
  }

  /** Collections history for reconciliation (range limit unclear in the docs: 1 or 3 months). */
  async history(input: { referenceNumber?: string; startDateTimeUTC: string; endDateTimeUTC?: string }) {
    const body = await this.call(
      "/history",
      { referenceNumber: input.referenceNumber, startDateTimeUTC: input.startDateTimeUTC, endDateTimeUTC: input.endDateTimeUTC },
      [input.referenceNumber]
    );
    return {
      statusCode: Number(body.statusCode),
      itemCount: Number(body.itemCount || 0),
      items: (Array.isArray(body.items) ? body.items : []).map((item: any) => ({
        referenceNumber: item.referenceNumber as string,
        operation: item.operation as string,
        action: item.action as string,
        status: item.status as string,
        amountKobo: safeNairaToKobo(item.amount),
      })),
    };
  }

  /**
   * Full or partial refund. `referenceNumber` is documented as the idempotency key, so a retry with
   * the same value never refunds twice.
   */
  async refund(input: { referenceNumber: string; paymentRequestReference: string; refundAmountKobo: number; reason?: string }) {
    const body = await this.call(
      "/refund/v2",
      {
        referenceNumber: input.referenceNumber,
        paymentRequestReference: input.paymentRequestReference,
        refundAmount: koboToNairaNumber(input.refundAmountKobo),
        currency: "NGN",
        reason: input.reason,
      },
      [input.referenceNumber, koboToNairaString(input.refundAmountKobo)]
    );
    return {
      statusCode: Number(body.statusCode),
      statusMessage: body.statusMessage as string,
      refundAmountKobo: safeNairaToKobo(body.refundAmount),
      refundDestination: (body.refundDestination as string) || null,
    };
  }
}
