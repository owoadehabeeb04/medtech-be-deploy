import { Request, Response, NextFunction } from "express";
import { ProductService } from "../Product.service";

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
    const products = await ProductService.getLowStockProducts(merchantId);

    res.status(200);
    res.response = {
      message: "Low stock products retrieved successfully",
      statusCode: 200,
      data: products,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/products/low-stock:
 *   get:
 *     summary: "Get low stock products"
 *     description: "Get low stock products for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_products_low_stock"
 *     tags: ["Products"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LowStockProductsResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 */
