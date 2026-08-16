import { Request, Response, NextFunction } from "express";
import { DiscountService } from "../Discount.service";

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

    const { discountId } = req.params;

    if (!discountId || Array.isArray(discountId)) {
      res.status(400);
      res.response = {
        message: "Invalid discount ID",
        statusCode: 400,
      };
      return next();
    }

    const discount = await DiscountService.restoreDiscount(merchantId, discountId);

    res.status(200);
    res.response = {
      message: "Discount restored successfully",
      statusCode: 200,
      data: discount,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/discounts/{discountId}/restore:
 *   post:
 *     summary: "Restore discount"
 *     description: "Restore discount for the merchant API."
 *     operationId: "merchant_post_api_v1_merchant_discounts_discountId_restore"
 *     tags: ["Discounts"]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: discountId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/DiscountResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       404:
 *         description: "Requested resource was not found"
 *       409:
 *         description: "Business rule conflict"
 */
