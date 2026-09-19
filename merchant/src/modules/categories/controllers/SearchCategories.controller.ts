import { Request, Response, NextFunction } from "express";
import { ProductCategoryService } from "../ProductCategory.service";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = String(req.query.q || req.query.search || "").trim();
    if (!query) {
      res.status(400);
      res.response = {
        message: "q query param is required",
        statusCode: 400,
      };
      return next();
    }

    const results = await ProductCategoryService.search(query);
    res.status(200);
    res.response = {
      message: "Category search completed successfully",
      statusCode: 200,
      data: {
        query,
        results,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/v1/merchant/categories/search:
 *   get:
 *     summary: Search the global product category tree
 *     description: Search category names and stable keys. A matching group includes its descendants; a matching detailed category includes its full breadcrumb so duplicate names such as Shampoo remain distinguishable.
 *     operationId: merchant_get_api_v1_merchant_categories_search
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         description: Text to search, for example Veterinary or Shampoo.
 *         schema: { type: string, minLength: 1, example: Shampoo }
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CategorySearchResponse"
 *       400: { description: q query param is required }
 *       401: { description: Authentication required }
 */
