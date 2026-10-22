import { Request, Response, NextFunction } from "express";
import { validateSchema, HttpException } from "@medtech/utils";
import { applicationConfig } from "../../../config";
import { quoteWithdrawalSchema } from "../Wallet.schema";
import { WalletWithdrawalPaga } from "../WalletWithdrawalPaga.service";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.context;
    if (!user?.id) {
      res.status(401);
      res.response = { message: "Authentication required", statusCode: 401 };
      return next();
    }

    const { error, value } = validateSchema(quoteWithdrawalSchema, req.body);
    if (error) {
      res.status(400);
      res.response = { message: error, statusCode: 400 };
      return next();
    }

    if (applicationConfig.withdrawals.provider === "paystack") {
      throw new HttpException(400, "Withdrawal fees are not quoted in advance on this payment provider.");
    }

    const quote = await WalletWithdrawalPaga.quote(String(user.id), value.amount);
    res.status(200);
    res.response = { message: "Withdrawal quote", statusCode: 200, data: WalletWithdrawalPaga.describeQuote(quote) };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/wallet/withdraw/quote:
 *   post:
 *     summary: "Quote a withdrawal"
 *     description: "Shows what a withdrawal would cost before the merchant confirms: the amount the bank receives, Paga's fee (including VAT) which the merchant pays on top, and the total taken from the wallet. Also re-checks that the saved bank account still exists and still belongs to the same holder. Send the returned total as acceptedTotal when calling POST /wallet/withdraw."
 *     operationId: "merchant_post_api_v1_merchant_wallet_withdraw_quote"
 *     tags: ["Wallet"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/QuoteWithdrawalRequest"
 *     responses:
 *       200:
 *         description: "The quote"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/QuoteWithdrawalResponse"
 *       400:
 *         description: "Below the minimum, no verified bank account, or the account no longer matches"
 *       401:
 *         description: "Authentication required"
 *       503:
 *         description: "Payments are temporarily unavailable. Safe to retry."
 */
