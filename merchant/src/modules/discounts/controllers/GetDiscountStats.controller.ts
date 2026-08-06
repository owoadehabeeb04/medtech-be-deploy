import { Request, Response, NextFunction } from "express";
import { DiscountService } from "../Discount.service";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.context;

    if (!user?.id) {
      res.status(401);
      res.response = {
        message: "Authentication required",
        statusCode: 401,
      };
      return next();
    }

    const merchantId: string = String(user.id);

    const stats = await DiscountService.getDiscountStats(merchantId);

    res.status(200);
    res.response = {
      message: "Discount statistics retrieved successfully",
      statusCode: 200,
      data: stats,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/discounts/stats:
 *   get:
 *     summary: "Get discount stats"
 *     description: "Get discount stats for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_discounts_stats"
 *     tags: ["Discounts"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/DiscountStatsResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 */
