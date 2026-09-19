import { Request, Response, NextFunction } from "express";
import { ProductService } from "../Product.service";
import { createProductSchema } from "../Product.schema";
import { validateSchema } from "@medtech/utils";
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

    const { error, value } = validateSchema(createProductSchema, req.body);
    if (error) {
      res.status(400);
      res.response = {
        message: error,
        statusCode: 400,
      };
      return next();
    }

    const category = await ProductCategoryService.resolveForProduct(value.categoryId, value.category);
    value.categoryId = category.id;
    value.category = category.name;

    const product = await ProductService.createProduct(merchantId, value);

    res.status(201);
    res.response = {
      message: "Product created successfully",
      statusCode: 201,
      data: product,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/products:
 *   post:
 *     summary: "Create product"
 *     description: "Create product for the merchant API."
 *     operationId: "merchant_post_api_v1_merchant_products"
 *     tags: ["Products"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CreateProductRequest"
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
 *       409:
 *         description: "Business rule conflict"
 */
