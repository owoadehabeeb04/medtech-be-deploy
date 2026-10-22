import { Request, Response, NextFunction } from "express";
import { WalletService } from "../Wallet.service";
import { validateSchema } from "@medtech/utils";
import { withdrawWalletSchema } from "../Wallet.schema";
import { IdempotencyService } from "../../payments/Idempotency.service";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.context;

    if (!user?.id) {
      res.status(401);
      res.response = { message: "Authentication required", statusCode: 401 };
      return next();
    }

    const { error, value } = validateSchema(withdrawWalletSchema, req.body);
    if (error) {
      res.status(400);
      res.response = { message: error, statusCode: 400 };
      return next();
    }

    // With an Idempotency-Key header a retry returns the first result instead of starting a second withdrawal
    const idempotencyKey = req.get("Idempotency-Key");
    const withdraw = () => WalletService.withdrawWallet(String(user.id), value.amount, value.reason, value.acceptedTotal);
    const result = idempotencyKey
      ? (await IdempotencyService.run(`merchant:${user.id}:wallet-withdraw`, idempotencyKey, req.body, withdraw)).value
      : await withdraw();

    res.status(200);
    res.response = {
      message: result.message,
      statusCode: 200,
      data: result,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/wallet/withdraw:
 *   post:
 *     summary: "Withdraw wallet"
 *     description: "Sends money from the wallet to the merchant's verified bank account through Paga. The bank receives exactly the amount; Paga's fee (shown by POST /wallet/withdraw/quote) is charged on top, so the wallet pays amount + fee. The wallet is debited first; if the transfer definitely fails it is refunded automatically, and if the outcome is unknown (timeout) the withdrawal stays pending and is resolved in the background, never refunded blindly. Only one withdrawal can be processing at a time per merchant. Send an optional Idempotency-Key header so a retry does not start a second withdrawal."
 *     operationId: "merchant_post_api_v1_merchant_wallet_withdraw"
 *     tags: ["Wallet"]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: false
 *         schema: { type: string }
 *         description: "Unique value per withdrawal attempt (for example a UUID)."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/WithdrawWalletRequest"
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/WithdrawWalletResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       409:
 *         description: "Another withdrawal is already processing, the fee changed since the quote (confirm the new total), or Idempotency-Key was reused with a different request"
 *       503:
 *         description: "Withdrawals are temporarily unavailable (Paga unreachable or out of balance). The wallet was not charged. Safe to retry."
 */
