import { Request, Response, NextFunction } from "express";
import { ProductCategoryService } from "../ProductCategory.service";

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

    const parentId = req.query.parentId ? String(req.query.parentId).trim() : undefined;
    const includeChildren = req.query.includeChildren === "true";
    const categories = await ProductCategoryService.list({ parentId, includeChildren });

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
 *     summary: "Browse the global product category tree"
 *     description: "Returns the five top-level categories by default. Pass parentId to retrieve one level of children, or includeChildren=true to include the descendant tree in each returned node. Categories are platform-managed and read-only for merchants."
 *     operationId: "merchant_get_api_v1_merchant_categories"
 *     tags: ["Categories"]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: parentId
 *         in: query
 *         required: false
 *         description: "Return the direct children of this category. Omit it to return the five top-level categories."
 *         schema: { type: string, format: uuid }
 *       - name: includeChildren
 *         in: query
 *         required: false
 *         description: "When true, include the nested children under each returned category."
 *         schema: { type: boolean, default: false }
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
