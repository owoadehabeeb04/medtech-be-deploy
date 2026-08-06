import { Request, Response, NextFunction } from "express";
import { ProductService } from "../Product.service";
import { HttpException } from "@medtech/utils";

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

    const {
      page = "1",
      limit = "20",
      search,
      category,
      status,
      isActive,
    } = req.query;

    const options = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      search: search as string,
      category: category as string,
      status: status as any,
      isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
    };

    const products = await ProductService.getAllProducts(merchantId, options);

    res.status(200);
    res.response = {
      message: "Products retrieved successfully",
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
 * /api/v1/merchant/products:
 *   get:
 *     summary: "Get products"
 *     description: "Get products for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_products"
 *     tags: ["Products"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProductListResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 */
