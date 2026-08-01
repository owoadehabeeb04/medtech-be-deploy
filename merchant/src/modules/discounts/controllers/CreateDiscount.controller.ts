import { Request, Response, NextFunction } from "express";
import { DiscountService } from "../Discount.service";
import { createDiscountSchema } from "../Discount.schema";
import { validateSchema } from "@medtech/utils";

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

    const { error, value } = validateSchema(createDiscountSchema, req.body);
    if (error) {
      res.status(400);
      res.response = {
        message: error,
        statusCode: 400,
      };
      return next();
    }

    const discount = await DiscountService.createDiscount(merchantId, value);

    res.status(201);
    res.response = {
      message: "Discount created successfully",
      statusCode: 201,
      data: discount,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/discounts:
 *   post:
 *     summary: "Create discount"
 *     description: "Create discount for the merchant API."
 *     operationId: "merchant_post_api_v1_merchant_discounts"
 *     tags: ["Discounts"]
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
 *               $ref: "#/components/schemas/SuccessResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       409:
 *         description: "Business rule conflict"
 */
