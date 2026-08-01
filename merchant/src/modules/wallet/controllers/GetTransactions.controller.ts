import { Request, Response, NextFunction } from "express";
import { WalletService } from "../Wallet.service";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.context;

    if (!user?.id) {
      res.status(401);
      res.response = { message: "Authentication required", statusCode: 401 };
      return next();
    }

    const { page, limit, type, status } = req.query;

    const result = await WalletService.getTransactions(String(user.id), {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      type: type as string | undefined,
      status: status as string | undefined,
    });

    res.status(200);
    res.response = {
      message: "Transactions retrieved successfully",
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
 * /api/v1/merchant/wallet/transactions:
 *   get:
 *     summary: "Get transactions"
 *     description: "Get transactions for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_wallet_transactions"
 *     tags: ["Wallet"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 */
