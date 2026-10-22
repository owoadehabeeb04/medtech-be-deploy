import { Request, Response, NextFunction } from "express";
import { verifyBusinessCallback } from "@medtech/utils";
import { applicationConfig } from "../../config";
import { Transaction } from "../transactions/Transaction.model";
import { TransactionType } from "../../constants/enums";
import { PaymentEventService } from "./PaymentEvent.service";
import { WalletWithdrawalPaga } from "../wallet/WalletWithdrawalPaga.service";
import { PAGA_PROVIDER } from "../wallet/WalletFundingPaga.service";

const ok = (res: Response, next: NextFunction, message: string) => {
  res.status(200);
  res.response = { message, statusCode: 200 };
  return next();
};

/**
 * Paga -> statusCallbackUrl after a payout. The callback only tells us "look at this reference": the actual
 * result is read from Paga (getOperationStatus), so a forged or odd callback can never move money.
 */
export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, any>;
    const reference = typeof body.referenceNumber === "string" ? body.referenceNumber : null;
    const verdict = verifyBusinessCallback(req.headers, body, applicationConfig.paga.hashKey);

    const { event, duplicate } = await PaymentEventService.record({
      provider: PAGA_PROVIDER,
      eventType: "payout",
      dedupeKey: `${reference}:${body.transactionId}:${body.sessionId}`,
      reference,
      payload: body,
      signatureValid: verdict.valid,
    });

    if (!verdict.valid) {
      res.status(401);
      res.response = { message: "Invalid signature", statusCode: 401 };
      return next();
    }
    if (duplicate && !PaymentEventService.shouldProcess(event)) return ok(res, next, "Already received");

    if (!reference || !reference.startsWith("MER-WD-")) {
      await PaymentEventService.markIgnored(event.id, "reference does not belong to a merchant withdrawal");
      return ok(res, next, "Ignored");
    }

    const transaction = await Transaction.findOne({ where: { providerReference: reference, paymentProvider: PAGA_PROVIDER } });
    if (!transaction || transaction.type !== TransactionType.WALLET_DEBIT) {
      await PaymentEventService.markIgnored(event.id, "no matching withdrawal");
      return ok(res, next, "Received");
    }

    try {
      await WalletWithdrawalPaga.resolve(transaction);
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
 * /api/v1/merchant/payments/paga/payout-webhook:
 *   post:
 *     summary: "Paga payout webhook"
 *     description: "Called by Paga (not by apps) when a withdrawal payout finishes. Public: authenticated by the x-paga-hash header. The event is stored, then the payout's real status is read from Paga before the withdrawal is marked complete or refunded. Replies 200 once stored or ignored, 401 for a bad hash, 5xx only on our own failure so Paga retries."
 *     operationId: "merchant_post_api_v1_merchant_payments_paga_payout_webhook"
 *     tags: ["Wallet"]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               referenceNumber: { type: string, example: "MER-WD-3f9a1c0b7d2e4a65b8c1" }
 *               transactionDate: { type: string }
 *               transactionId: { type: string }
 *               amount: { type: string, example: "20000.00" }
 *               sessionId: { type: string }
 *     responses:
 *       200:
 *         description: "Stored (or ignored)"
 *       401:
 *         description: "Invalid hash"
 */
