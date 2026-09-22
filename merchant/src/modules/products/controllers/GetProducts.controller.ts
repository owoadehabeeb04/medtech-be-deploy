import { Request, Response, NextFunction } from "express";
import { ProductService } from "../Product.service";
import { HttpException } from "@medtech/utils";
import { ProductCategoryService } from "../../categories/ProductCategory.service";

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
      categoryId,
      categoryReviewRequired,
      status,
      isActive,
    } = req.query;

    const options = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      search: search as string,
      category: category as string,
      categoryId: categoryId as string,
      categoryReviewRequired:
        categoryReviewRequired === "true" ? true : categoryReviewRequired === "false" ? false : undefined,
      status: status as any,
      isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
    };

    const products = await ProductService.getAllProducts(merchantId, options);

    res.status(200);
    res.response = {
      message: "Products retrieved successfully",
      statusCode: 200,
      data: {
        ...products,
        products: await ProductCategoryService.attachCategoryHierarchy(products.products),
      },
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
 *     description: "Get products for the authenticated merchant. Pass categoryId from the global category tree; selecting a group returns products assigned to any selectable descendant, while selecting a detailed category returns products assigned directly to it. The legacy category name remains supported during migration."
 *     operationId: "merchant_get_api_v1_merchant_products"
 *     tags: ["Products"]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         required: false
 *         description: "Global category ID. A group includes products in all selectable descendant categories; a detailed category filters to that category."
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: category
 *         required: false
 *         description: "Legacy category name filter retained during migration; prefer categoryId."
 *         schema: { type: string }
 *       - in: query
 *         name: categoryReviewRequired
 *         required: false
 *         description: "Filter products whose legacy category still needs manual mapping."
 *         schema: { type: boolean }
 *       - in: query
 *         name: search
 *         required: false
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         required: false
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer, minimum: 1, default: 20 }
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
