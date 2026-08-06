import { Request, Response, NextFunction } from "express";
import { ProductService } from "../Product.service";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = (req as any).merchant?.id

    if (!merchantId) {
      res.status(401);
      res.response = {
        message: "Unauthorized",
        statusCode: 401,
      };
      return next();
    }

    const stats = await ProductService.getProductStats(merchantId);

    res.status(200);
    res.response = {
      message: "Product statistics retrieved successfully",
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
 * /api/v1/merchant/products/stats:
 *   get:
 *     summary: "Get product stats"
 *     description: "Get product stats for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_products_stats"
 *     tags: ["Products"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProductStatsResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 */
