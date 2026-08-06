import { Request, Response, NextFunction } from "express";
import { CategoryService } from "../Category.service";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = (req as any).merchant?.id;
    const { categoryId } = req.params;

    if (!merchantId) {
      res.status(401);
      res.response = {
        message: "Unauthorized",
        statusCode: 401,
      };
      return next();
    }

    if (!categoryId || Array.isArray(categoryId)) {
      res.status(400);
      res.response = {
        message: "Invalid category ID",
        statusCode: 400,
      };
      return next();
    }

    const category = await CategoryService.getCategoryById(merchantId, categoryId);

    res.status(200);
    res.response = {
      message: "Category retrieved successfully",
      statusCode: 200,
      data: category,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/categories/{categoryId}:
 *   get:
 *     summary: "Get category"
 *     description: "Get category for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_categories_categoryId"
 *     tags: ["Categories"]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CategoryResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       404:
 *         description: "Requested resource was not found"
 */
