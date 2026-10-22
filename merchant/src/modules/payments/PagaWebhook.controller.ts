import { Request, Response, NextFunction } from "express";
import { verifyCheckoutCallback } from "@medtech/utils";
import { applicationConfig } from "../../config";
import { Transaction } from "../transactions/Transaction.model";
import { TransactionType } from "../../constants/enums";
import { PaymentEventService } from "./PaymentEvent.service";
import { WalletService } from "../wallet/Wallet.service";
import { WalletFundingPaga, PAGA_PROVIDER } from "../wallet/WalletFundingPaga.service";

const ok = (res: Response, next: NextFunction, message: string) => {
  res.status(200);
  res.response = { message, statusCode: 200 };
  return next();
};

/**
 * Paga Checkout -> callback_url. Order of work: store first, then check the hash, then ask Paga whether
 * the payment is real, then credit (once). We answer 200 as soon as the event is safely stored or
 * deliberately ignored; a 5xx (our own failure) makes Paga send it again.
 */
export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, any>;
    const reference = typeof body.paymentReference === "string" ? body.paymentReference : null;
    const verdict = verifyCheckoutCallback(body, applicationConfig.paga.hashKey);

    const { event, duplicate } = await PaymentEventService.record({
      provider: PAGA_PROVIDER,
      eventType: "checkout",
      dedupeKey: `${reference}:${body.statusCode}:${body.timeStamp}`,
      reference,
      // never keep the hash itself
      payload: { ...body, hash: undefined },
      signatureValid: verdict.valid,
    });

    if (!verdict.valid) {
      res.status(401);
      res.response = { message: "Invalid signature", statusCode: 401 };
      return next();
    }

    if (duplicate && !PaymentEventService.shouldProcess(event)) return ok(res, next, "Already received");

    // The other service shares this Paga account (its references start with EXP-); not ours to handle
    if (!reference || !reference.startsWith("MER-")) {
      await PaymentEventService.markIgnored(event.id, "reference does not belong to the merchant service");
      return ok(res, next, "Ignored");
    }

    // Only a success matters here. Anything else leaves the payment pending for the sweeper to resolve.
    if (String(body.statusCode) !== "0") {
      await PaymentEventService.markIgnored(event.id, `status ${body.statusCode}`);
      return ok(res, next, "Received");
    }

    const transaction = await Transaction.findOne({
      where: { providerReference: reference, paymentProvider: PAGA_PROVIDER },
    });
    if (!transaction || transaction.type !== TransactionType.WALLET_FUNDING) {
      await WalletFundingPaga.recordUnmatched(reference, null, "unknown_reference", { source: "webhook", eventId: event.id });
      await PaymentEventService.markIgnored(event.id, "no matching funding");
      return ok(res, next, "Received");
    }

    try {
      const outcome = await WalletFundingPaga.check(transaction);
      if (outcome.state === "paid") {
        const result = await WalletService.settleFundingTransaction(reference, {
          source: "paga_webhook",
          expectedAmount: outcome.paidKobo,
        });
        WalletService.queueWalletFundingNotification(reference, result);
      }
      await PaymentEventService.markProcessed(event.id);
    } catch (error) {
      await PaymentEventService.markFailed(event.id, error);
      throw error;
    }

    return ok(res, next, "Webhook received");
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/payments/paga/webhook:
 *   post:
 *     summary: "Paga Checkout webhook"
 *     description: "Called by Paga (not by apps) after a Checkout payment. Public: it is authenticated by the hash in the body (SHA-512 of amount + timeStamp + paymentReference + hash key), not by a login. The event is stored first, the payment is then verified with Paga and the amount compared before the wallet is credited, once. Replies 200 once stored or deliberately ignored (including references that belong to the other service); 401 for a bad hash; 5xx only on our own failure so Paga retries. Paga must be told this URL as callback_url, and its IP must be whitelisted."
 *     operationId: "merchant_post_api_v1_merchant_payments_paga_webhook"
 *     tags: ["Wallet"]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               statusCode: { type: string, example: "0", description: "0 = success" }
 *               paymentReference: { type: string, example: "MER-WF-3f9a1c0b7d2e4a65b8c1" }
 *               amount: { type: string, example: "5000.00" }
 *               currency: { type: string, example: "NGN" }
 *               timeStamp: { type: string }
 *               hash: { type: string }
 *     responses:
 *       200:
 *         description: "Stored (or ignored). Nothing more for Paga to do."
 *       401:
 *         description: "Invalid hash"
 */
