import { Request, Response, NextFunction } from "express";
import { ProductService } from "../Product.service";
import { updateProductSchema } from "../Product.schema";
import { validateSchema } from "@medtech/utils";
import { ProductCategoryService } from "../../categories/ProductCategory.service";

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

    const { productId } = req.params;
    
    if (!productId || Array.isArray(productId)) {
      res.status(400);
      res.response = {
        message: "Invalid product ID",
        statusCode: 400,
      };
      return next();
    }

    const { error, value } = validateSchema(updateProductSchema, req.body);
    if (error) {
      res.status(400);
      res.response = {
        message: error,
        statusCode: 400,
      };
      return next();
    }

    if (value.categoryId !== undefined || value.category !== undefined) {
      const category = await ProductCategoryService.resolveForProduct(value.categoryId, value.category);
      value.categoryId = category.id;
      value.category = category.name;
    }

    const product = await ProductService.updateProduct(
      merchantId,
      productId,
      value
    );

    res.status(200);
    res.response = {
      message: "Product updated successfully",
      statusCode: 200,
      data: product,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/products/{productId}:
 *   patch:
 *     summary: "Update product"
 *     description: "Update product for the merchant API."
 *     operationId: "merchant_patch_api_v1_merchant_products_productId"
 *     tags: ["Products"]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UpdateProductRequest"
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProductResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       404:
 *         description: "Requested resource was not found"
 *       409:
 *         description: "Business rule conflict"
 */
