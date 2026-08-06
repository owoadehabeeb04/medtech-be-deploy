import { Request, Response, NextFunction } from "express";
import { SubscriptionService } from "../Subscription.service";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await SubscriptionService.getPlans();

    res.status(200);
    res.response = {
      message: "Plans retrieved successfully",
      statusCode: 200,
      data: plans,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/subscriptions/plans:
 *   get:
 *     summary: "Get plans"
 *     description: "Get plans for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_subscriptions_plans"
 *     tags: ["Subscriptions"]
 *     security: []
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PlansResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication or signature rejected"
 */
