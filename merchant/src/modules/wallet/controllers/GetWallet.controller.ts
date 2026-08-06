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

    const wallet = await WalletService.getWallet(String(user.id));

    res.status(200);
    res.response = {
      message: "Wallet retrieved successfully",
      statusCode: 200,
      data: wallet,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/wallet:
 *   get:
 *     summary: "Get wallet"
 *     description: "Get wallet for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_wallet"
 *     tags: ["Wallet"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/GetWalletResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 */
