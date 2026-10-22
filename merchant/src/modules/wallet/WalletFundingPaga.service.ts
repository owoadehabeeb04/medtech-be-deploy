import { v4 as uuidv4 } from "uuid";
import { PagaError, buildCheckoutLink, verifyCheckoutPayment } from "@medtech/utils";
import { HttpException } from "@medtech/utils";
import { applicationConfig } from "../../config";
import { Transaction } from "../transactions/Transaction.model";
import { Merchant } from "../merchant/Merchant.model";
import { UnmatchedPayment } from "../payments/UnmatchedPayment.model";
import { resolveChargeUrl } from "../payments/returnUrl";
import { getPagaCheckoutConfig, PagaNotConfiguredError } from "../../service/Payments/PagaClients";
import { TransactionStatus, TransactionType, PaymentMethod } from "../../constants/enums";
import { Wallet } from "./Wallet.model";

export const PAGA_PROVIDER = "paga";
const WEBHOOK_PATH = "/api/v1/merchant/payments/paga/webhook";

/** Turn "Paga isn't set up" / "Paga is unreachable" into a client-facing 503 (retrying is safe). */
export const toUnavailable = (error: unknown): HttpException => {
  if (error instanceof PagaNotConfiguredError) {
    console.error("[Payments]", error.message);
  } else if (error instanceof PagaError) {
    console.error("[Payments] Paga request failed:", error.kind, error.message);
  } else {
    console.error("[Payments] Unexpected error:", (error as Error)?.message);
  }
  return new HttpException(503, "Payments are temporarily unavailable. Please try again shortly.");
};

export class WalletFundingPaga {
  static newReference(): string {
    return `MER-WF-${uuidv4().replace(/-/g, "").substring(0, 20)}`;
  }

  /**
   * Start a wallet funding on Paga. The pending transaction is saved BEFORE the link exists, so a payment
   * can never be made that we have no record of.
   */
  static async initiate(merchant: Merchant, wallet: Wallet, amountInKobo: number, amountInNaira: number, requestedReturnUrl?: string) {
    let config;
    try {
      config = getPagaCheckoutConfig();
    } catch (error) {
      throw toUnavailable(error);
    }

    const reference = this.newReference();
    const chargeUrl = resolveChargeUrl(reference, "wallet", requestedReturnUrl);

    await Transaction.create({
      merchantId: merchant.id,
      walletId: wallet.id,
      type: TransactionType.WALLET_FUNDING,
      amount: amountInKobo,
      status: TransactionStatus.PENDING,
      paymentMethod: PaymentMethod.CARD,
      paystackReference: null,
      paymentProvider: PAGA_PROVIDER,
      providerReference: reference,
      description: `Wallet funding — ₦${amountInNaira.toLocaleString()}`,
      metadata: { type: "wallet_funding", provider: PAGA_PROVIDER },
    } as any);

    const authorizationUrl = buildCheckoutLink(config, {
      amountKobo: amountInKobo,
      email: merchant.email,
      paymentReference: reference,
      chargeUrl,
      callbackUrl: applicationConfig.payments.publicBaseUrl + WEBHOOK_PATH,
    });

    return {
      authorizationUrl,
      accessCode: null as string | null,
      reference,
      amount: amountInKobo,
      provider: PAGA_PROVIDER,
    };
  }

  /**
   * Ask Paga whether a funding was really paid. Returns:
   *   - paid:    Paga says success and the amount is what we expected
   *   - waiting: not paid (yet): success is still possible, so nothing is marked failed
   * A paid amount that differs from the expected one is recorded for review and never credited.
   */
  static async check(transaction: Transaction): Promise<{ state: "paid"; paidKobo: number } | { state: "waiting" }> {
    const expected = Number(transaction.amount);
    const reference = transaction.providerReference as string;

    let verification;
    try {
      verification = await verifyCheckoutPayment(getPagaCheckoutConfig(), { paymentReference: reference, amountKobo: expected });
    } catch (error) {
      throw toUnavailable(error);
    }

    if (verification.status !== "success") return { state: "waiting" };

    if (verification.paidAmountKobo !== null && verification.paidAmountKobo !== expected) {
      await this.recordUnmatched(reference, verification.paidAmountKobo, "amount_mismatch", {
        expectedKobo: expected,
        paidKobo: verification.paidAmountKobo,
        source: "verify",
      });
      throw new HttpException(409, "The amount paid does not match this funding request. Our team has been notified.");
    }

    return { state: "paid", paidKobo: expected };
  }

  /** Keep a record of money we could not apply, so it is never silently lost. */
  static async recordUnmatched(reference: string | null, amountKobo: number | null, reason: string, payload: Record<string, unknown>) {
    // The sweeper looks at the same payment every few minutes: record it once
    if (reference) {
      const existing = await UnmatchedPayment.findOne({ where: { provider: PAGA_PROVIDER, reference, reason } });
      if (existing) return;
    }
    await UnmatchedPayment.create({ provider: PAGA_PROVIDER, reference, amountKobo, reason, payload });
    console.error(`[Payments] Unmatched Paga payment (${reason}) reference=${reference} amountKobo=${amountKobo}`);
  }
}
