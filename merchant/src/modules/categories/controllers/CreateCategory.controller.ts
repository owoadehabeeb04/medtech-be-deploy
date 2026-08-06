import { Request, Response, NextFunction } from "express";
import { CategoryService } from "../Category.service";
import { validateSchema } from "@medtech/utils";
import { createCategorySchema } from "../Category.schema";

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

    const { error, value } = validateSchema(createCategorySchema, req.body);
    if (error) {
      res.status(400);
      res.response = {
        message: error,
        statusCode: 400,
      };
      return next();
    }

    const category = await CategoryService.createCategory(merchantId, value);

    res.status(201);
    res.response = {
      message: "Category created successfully",
      statusCode: 201,
      data: category,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/categories:
 *   post:
 *     summary: "Create category"
 *     description: "Create category for the merchant API."
 *     operationId: "merchant_post_api_v1_merchant_categories"
 *     tags: ["Categories"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, additionalProperties: true }
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
 *       409:
 *         description: "Business rule conflict"
 */
