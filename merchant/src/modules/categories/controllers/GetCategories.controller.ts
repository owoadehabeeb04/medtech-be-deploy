import { Request, Response, NextFunction } from "express";
import { CategoryService } from "../Category.service";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = (req as any).merchant?.id;

    if (!merchantId) {
      res.status(401);
      res.response = {
        message: "Unauthorized",
        statusCode: 401,
      };
      return next();
    }

    const includeInactive = req.query.includeInactive === "true";
    const categories = await CategoryService.getAllCategories(merchantId, includeInactive);

    res.status(200);
    res.response = {
      message: "Categories retrieved successfully",
      statusCode: 200,
      data: categories,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/categories:
 *   get:
 *     summary: "Get categories"
 *     description: "Get categories for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_categories"
 *     tags: ["Categories"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CategoryListResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 */
