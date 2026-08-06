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

    const { productId } = req.params;
    const productIdParam = Array.isArray(productId) ? productId[0] : productId;

    if (!productId || Array.isArray(productId)) {
      res.status(400);
      res.response = {
        message: "Invalid product ID",
        statusCode: 400,
      };
      return next();
    }

    const result = await ProductService.deleteProduct(merchantId, productId);

    res.status(200);
    res.response = {
      message: result.message,
      statusCode: 200,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/products/{productId}:
 *   delete:
 *     summary: "Delete product"
 *     description: "Delete product for the merchant API."
 *     operationId: "merchant_delete_api_v1_merchant_products_productId"
 *     tags: ["Products"]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MessageOnlyResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       404:
 *         description: "Requested resource was not found"
 */
