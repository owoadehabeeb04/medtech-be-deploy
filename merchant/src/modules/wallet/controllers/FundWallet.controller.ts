import { Request, Response, NextFunction } from "express";
import { WalletService } from "../Wallet.service";
import { validateSchema } from "@medtech/utils";
import { fundWalletSchema } from "../Wallet.schema";
import { IdempotencyService } from "../../payments/Idempotency.service";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.context;

    if (!user?.id) {
      res.status(401);
      res.response = { message: "Authentication required", statusCode: 401 };
      return next();
    }

    const { error, value } = validateSchema(fundWalletSchema, req.body);
    if (error) {
      res.status(400);
      res.response = { message: error, statusCode: 400 };
      return next();
    }

    // With an Idempotency-Key header, a retry (double tap, network drop) returns the first result instead of
    // creating a second funding
    const idempotencyKey = req.get("Idempotency-Key");
    const fund = () => WalletService.fundWallet(String(user.id), value.amount, value.returnUrl);
    const result = idempotencyKey
      ? (await IdempotencyService.run(`merchant:${user.id}:wallet-fund`, idempotencyKey, req.body, fund)).value
      : await fund();

    res.status(200);
    res.response = {
      message: "Wallet funding initiated successfully",
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
 * /api/v1/merchant/wallet/fund:
 *   post:
 *     summary: "Fund wallet"
 *     description: "Starts a wallet funding and returns a Paga Checkout link (authorizationUrl). Redirect the merchant to it. After paying, Paga sends the browser to the merchant app's /callback page (or the returnUrl given), which must call POST /wallet/confirm-funding with the reference. The wallet is also credited automatically by Paga's webhook and by a background check, so closing the page does not lose the payment. Send an optional Idempotency-Key header to make retries safe: the same key and body returns the first result, the same key with a different body returns 409."
 *     operationId: "merchant_post_api_v1_merchant_wallet_fund"
 *     tags: ["Wallet"]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: false
 *         schema: { type: string }
 *         description: "Unique value per funding attempt (for example a UUID). Retrying with the same key does not create a second funding."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/FundWalletRequest"
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/FundWalletResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       409:
 *         description: "Idempotency-Key reused with a different request, or another request with this key is still running"
 *       503:
 *         description: "Payments are temporarily unavailable (Paga not reachable or not configured). Safe to retry."
 */
