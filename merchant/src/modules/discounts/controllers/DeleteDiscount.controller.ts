import { Request, Response, NextFunction } from "express";
import { DiscountService } from "../Discount.service";

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

    const { discountId } = req.params;

    if (!discountId || Array.isArray(discountId)) {
      res.status(400);
      res.response = {
        message: "Invalid discount ID",
        statusCode: 400,
      };
      return next();
    }

    const result = await DiscountService.deleteDiscount(merchantId, discountId);

    res.status(200);
    res.response = {
      message: result.message,
      statusCode: 200,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/discounts/{discountId}:
 *   delete:
 *     summary: "Delete discount"
 *     description: "Delete discount for the merchant API."
 *     operationId: "merchant_delete_api_v1_merchant_discounts_discountId"
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
 *               $ref: "#/components/schemas/MessageOnlyResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       404:
 *         description: "Requested resource was not found"
 */
