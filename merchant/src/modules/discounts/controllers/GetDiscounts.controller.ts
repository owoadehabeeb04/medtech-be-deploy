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

    const {
      page = "1",
      limit = "20",
      search,
      status,
      isExpired,
    } = req.query;

    const options = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      search: search as string,
      status: status as any,
      isExpired: isExpired === "true" ? true : isExpired === "false" ? false : undefined,
    };

    const result = await DiscountService.getAllDiscounts(merchantId, options);

    res.status(200);
    res.response = {
      message: "Discounts retrieved successfully",
      statusCode: 200,
      data: result,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/discounts:
 *   get:
 *     summary: "Get discounts"
 *     description: "Get discounts for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_discounts"
 *     tags: ["Discounts"]
 *     security: [{ bearerAuth: [] }]
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
 */
