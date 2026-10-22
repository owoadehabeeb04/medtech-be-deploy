import { Request, Response, NextFunction } from "express";
import { WalletService } from "../Wallet.service";
import { validateSchema } from "@medtech/utils";
import { confirmFundingSchema } from "../Wallet.schema";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.context;

    if (!user?.id) {
      res.status(401);
      res.response = { message: "Authentication required", statusCode: 401 };
      return next();
    }

    const { error, value } = validateSchema(confirmFundingSchema, req.body);
    if (error) {
      res.status(400);
      res.response = { message: error, statusCode: 400 };
      return next();
    }

    const result = await WalletService.confirmFunding(String(user.id), value.reference);

    // 202: not paid (yet), still possible. 200: credited.
    const pending = Boolean((result as any).pending);
    res.status(pending ? 202 : 200);
    res.response = {
      message: result.message,
      statusCode: pending ? 202 : 200,
      data: pending ? { status: "pending", ...result.wallet } : result.wallet,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/wallet/confirm-funding:
 *   post:
 *     summary: "Confirm funding"
 *     description: "Asks Paga whether the funding with this reference was paid, and credits the wallet if so (only once, however many times this is called). Call it from the /callback page the merchant returns to after paying. 200 means credited (or already credited). 202 means Paga has not confirmed it yet: show a processing message, the wallet is credited automatically when the payment is confirmed. Never trust the redirect alone; the answer always comes from Paga."
 *     operationId: "merchant_post_api_v1_merchant_wallet_confirm_funding"
 *     tags: ["Wallet"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ConfirmFundingRequest"
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ConfirmFundingResponse"
 *       202:
 *         description: "Not paid (yet). Nothing was credited or marked failed; data.status is pending."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ConfirmFundingResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       409:
 *         description: "The amount paid does not match the funding request; not credited, flagged for review"
 *       503:
 *         description: "Payments are temporarily unavailable. Safe to retry."
 */
