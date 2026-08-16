import { Request, Response, NextFunction } from "express";
import { CategoryService } from "../Category.service";
import { validateSchema } from "@medtech/utils";
import { updateCategorySchema } from "../Category.schema";

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

    const { error, value } = validateSchema(updateCategorySchema, req.body);
    if (error) {
      res.status(400);
      res.response = {
        message: error,
        statusCode: 400,
      };
      return next();
    }

    const category = await CategoryService.updateCategory(merchantId, categoryId, value);

    res.status(200);
    res.response = {
      message: "Category updated successfully",
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
 *   patch:
 *     summary: "Update category"
 *     description: "Update category for the merchant API."
 *     operationId: "merchant_patch_api_v1_merchant_categories_categoryId"
 *     tags: ["Categories"]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UpdateCategoryRequest"
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
 *       409:
 *         description: "Business rule conflict"
 */
