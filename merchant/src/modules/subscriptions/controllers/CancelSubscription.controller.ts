import { Request, Response, NextFunction } from "express";
import { SubscriptionService } from "../Subscription.service";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.context;

    if (!user?.id) {
      res.status(401);
      res.response = { message: "Authentication required", statusCode: 401 };
      return next();
    }

    const result = await SubscriptionService.cancelSubscription(String(user.id));

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
 * /api/v1/merchant/subscriptions/cancel:
 *   post:
 *     summary: "Cancel subscription"
 *     description: "Cancel subscription for the merchant API."
 *     operationId: "merchant_post_api_v1_merchant_subscriptions_cancel"
 *     tags: ["Subscriptions"]
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
 *               $ref: "#/components/schemas/MessageOnlyResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       409:
 *         description: "Business rule conflict"
 */
