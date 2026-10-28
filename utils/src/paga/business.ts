import { PagaConfig, resolveUrls, DEFAULT_TIMEOUT_MS, PagaTransport } from "./config";
import { PagaError } from "./errors";
import { pagaHash } from "./hash";
import { koboToNairaNumber, koboToNairaString, nairaToKobo, safeNairaToKobo } from "./money";
import { fetchTransport } from "./transport";

/** Documented Business API response codes (developer-docs.paga.com/docs/error-codes). */
export type BusinessOutcome = "success" | "pending" | "insufficient_balance" | "duplicate_reference" | "invalid_account" | "failed";

export const classifyBusinessCode = (code: unknown): BusinessOutcome => {
  const value = Number(code);
  if (value === 0) return "success";
  if (value === 3) return "pending";
  if (value === 139) return "insufficient_balance";
  if (value === 105) return "duplicate_reference";
  if (value === 4 || value === 107 || value === 114 || value === 115 || value === 133) return "invalid_account";
  return "failed";
};

/**
 * In the Business API request hash the amount is the plain JSON number as sent ("100", "100.5"), NOT "100.00".
 * Confirmed against the real sandbox 2026-10-28 (validateDepositToBank answered 'Invalid request hash' for "100.00"
 * and "100.0", and accepted "100"). Callback hashes are different: they use the two-decimal text Paga puts in the callback.
 */
const hashedAmount = (kobo: number): string => String(koboToNairaNumber(kobo));

export interface PagaBank {
  name: string;
  uuid: string;
  /** CBN sort code, e.g. "044" for Access Bank. Present in the real sandbox answer (the docs do not list it). */
  sortCode: string | null;
  directDebitEnabled: boolean | null;
}

export class PagaBusinessClient {
  private readonly transport: PagaTransport;

  constructor(private readonly config: PagaConfig) {
    this.transport = config.transport || fetchTransport;
  }

  private async call(operation: string, body: { [key: string]: unknown }, hashParts: Array<string | number | null | undefined>) {
    if (!this.config.businessPrincipal || !this.config.businessCredentials) {
      throw new Error("Paga Business API principal/credentials are not configured");
    }
    const urls = resolveUrls(this.config);
    const response = await this.transport({
      method: "POST",
      url: urls.business + "/paga-webservices/business-rest/secured/" + operation,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        principal: this.config.businessPrincipal,
        credentials: this.config.businessCredentials,
        hash: pagaHash(hashParts, this.config.hashKey),
      },
      body,
      timeoutMs: this.config.timeoutMs || DEFAULT_TIMEOUT_MS,
    });

    // A 5xx is "we don't know what happened"; 4xx and API-level codes are definite answers.
    if (response.status >= 500) {
      throw new PagaError("Paga Business API error (" + response.status + ")", { kind: "network", httpStatus: response.status, outcomeUnknown: true });
    }
    if (!response.body || typeof response.body !== "object") {
      throw new PagaError("Unreadable response from Paga", { kind: "invalid_response", httpStatus: response.status, outcomeUnknown: true });
    }
    return response.body;
  }

  /** Bank list. Banks are identified by a Paga UUID, not a bank code. */
  async getBanks(referenceNumber: string): Promise<{ responseCode: number; banks: PagaBank[]; message: string }> {
    const body = await this.call("getBanks", { referenceNumber }, [referenceNumber]);
    // The real sandbox answers with `banks`; Paga's docs describe `bank`. Accept either.
    const list = Array.isArray(body.banks) ? body.banks : Array.isArray(body.bank) ? body.bank : [];
    const banks: PagaBank[] = list.map((entry: any) => ({
      name: entry.name,
      uuid: entry.uuid,
      sortCode: entry.sortCode ? String(entry.sortCode) : null,
      directDebitEnabled: typeof entry.directDebitEnabled === "boolean" ? entry.directDebitEnabled : null,
    }));
    return { responseCode: Number(body.responseCode), banks, message: body.message };
  }

  /** Resolve the account holder's name. `amount` is mandatory in the request (docs); the caller chooses it. */
  async validateDepositToBank(input: {
    referenceNumber: string;
    amountKobo: number;
    destinationBankUUID: string;
    destinationBankAccountNumber: string;
    recipientName?: string;
    recipientEmail?: string;
    recipientPhoneNumber?: string;
  }) {
    const body = await this.call(
      "validateDepositToBank",
      {
        referenceNumber: input.referenceNumber,
        amount: koboToNairaNumber(input.amountKobo),
        currency: "NGN",
        destinationBankUUID: input.destinationBankUUID,
        destinationBankAccountNumber: input.destinationBankAccountNumber,
        recipientName: input.recipientName,
        recipientEmail: input.recipientEmail,
        recipientPhoneNumber: input.recipientPhoneNumber,
      },
      [input.referenceNumber, hashedAmount(input.amountKobo), input.destinationBankUUID, input.destinationBankAccountNumber]
    );

    return {
      responseCode: Number(body.responseCode),
      outcome: classifyBusinessCode(body.responseCode),
      referenceNumber: body.referenceNumber as string,
      accountHolderName: (body.destinationAccountHolderNameAtBank as string) || null,
      feeKobo: safeNairaToKobo(body.Fee),
      vatKobo: safeNairaToKobo(body.vat),
      message: body.message as string,
    };
  }

  /**
   * Pay out to a bank account from the business's Paga balance.
   * The reference must be unique: a repeat returns 105 (duplicate), which means "already submitted",
   * not "failed". After a network error the outcome is UNKNOWN: resolve with getOperationStatus().
   */
  async depositToBank(input: {
    referenceNumber: string;
    amountKobo: number;
    destinationBankUUID: string;
    destinationBankAccountNumber: string;
    recipientName?: string;
    recipientEmail?: string;
    recipientPhoneNumber?: string;
    remarks?: string;
    statusCallbackUrl?: string;
  }) {
    if (input.referenceNumber.length > 50) throw new Error("depositToBank referenceNumber must be 50 characters or fewer");

    const body = await this.call(
      "depositToBank",
      {
        referenceNumber: input.referenceNumber,
        amount: koboToNairaNumber(input.amountKobo),
        currency: "NGN",
        destinationBankUUID: input.destinationBankUUID,
        destinationBankAccountNumber: input.destinationBankAccountNumber,
        recipientName: input.recipientName,
        recipientEmail: input.recipientEmail,
        recipientPhoneNumber: input.recipientPhoneNumber,
        remarks: input.remarks,
        statusCallbackUrl: input.statusCallbackUrl,
      },
      [input.referenceNumber, hashedAmount(input.amountKobo), input.destinationBankUUID, input.destinationBankAccountNumber]
    );

    return {
      responseCode: Number(body.responseCode),
      outcome: classifyBusinessCode(body.responseCode),
      referenceNumber: body.referenceNumber as string,
      transactionId: (body.transactionId as string) || null,
      sessionId: (body.sessionId as string) || null,
      feeKobo: safeNairaToKobo(body.Fee),
      vatKobo: safeNairaToKobo(body.vat),
      accountHolderName: (body.destinationAccountHolderNameAtBank as string) || null,
      message: (body.message || body.Message) as string,
    };
  }

  /** The business's own Paga balance, in kobo: payouts are paid from availableBalance. */
  async accountBalance(referenceNumber: string) {
    const body = await this.call("accountBalance", { referenceNumber }, [referenceNumber]);
    // The sandbox answers an empty (zero) balance with responseCode -1 and a Java error text; that is not a balance.
    if (Number(body.responseCode) !== 0) {
      throw new PagaError("Paga could not return the balance: " + (body.message || "responseCode " + body.responseCode), { kind: "api", code: Number(body.responseCode), outcomeUnknown: false });
    }
    const total = safeNairaToKobo(body.totalBalance);
    const available = safeNairaToKobo(body.availableBalance);
    if (total === null || available === null) {
      // A balance we cannot read exactly must not be guessed at.
      throw new PagaError("Paga returned an unreadable balance", { kind: "invalid_response", outcomeUnknown: false });
    }
    return {
      responseCode: Number(body.responseCode),
      totalBalanceKobo: total,
      availableBalanceKobo: available,
      message: (body.message || body.Message) as string,
    };
  }

  /** Status of an earlier operation (e.g. a payout) by the reference we sent. */
  async getOperationStatus(referenceNumber: string) {
    const body = await this.call("getOperationStatus", { referenceNumber }, [referenceNumber]);
    return {
      responseCode: Number(body.responseCode),
      outcome: classifyBusinessCode(body.responseCode),
      transactionId: (body.transactionId as string) || null,
      transactionStatus: (body.transactionStatus as string) || null,
      message: (body.message || body.Message) as string,
    };
  }

  /** Account history for reconciliation. Window: start inclusive, end exclusive, UTC; capped at the latest 10,000. */
  async transactionHistory(input: { referenceNumber: string; startDateUTC: string; endDateUTC: string }) {
    const body = await this.call(
      "transactionHistory",
      { referenceNumber: input.referenceNumber, startDateUTC: input.startDateUTC, endDateUTC: input.endDateUTC },
      [input.referenceNumber]
    );
    return {
      responseCode: Number(body.responseCode),
      recordCount: Number(body.recordCount || 0),
      items: (Array.isArray(body.items) ? body.items : []).map((item: any) => ({
        referenceNumber: item.referenceNumber as string,
        transactionId: item.transactionId as string,
        transactionReference: item.transactionReference as string,
        status: item.status as string,
        transactionType: item.transactionType as string,
        amountKobo: safeNairaToKobo(item.amount),
        feeKobo: safeNairaToKobo(item.fee),
        reversalId: (item.reversalId as string) || null,
        dateUTC: Number(item.dateUTC),
      })),
    };
  }
}
