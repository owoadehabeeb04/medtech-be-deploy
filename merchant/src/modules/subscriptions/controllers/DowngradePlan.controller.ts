import { Request, Response, NextFunction } from "express";
import { SubscriptionService } from "../Subscription.service";
import { validateSchema } from "@medtech/utils";
import { downgradePlanSchema } from "../Subscription.schema";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.context;

    if (!user?.id) {
      res.status(401);
      res.response = { message: "Authentication required", statusCode: 401 };
      return next();
    }

    const { error, value } = validateSchema(downgradePlanSchema, req.body);
    if (error) {
      res.status(400);
      res.response = { message: error, statusCode: 400 };
      return next();
    }

    const result = await SubscriptionService.downgradePlan(
      String(user.id),
      value.planId
    );

    res.status(200);
    res.response = {
      message: result.message,
      statusCode: 200,
      data: {
        scheduledDate: result.scheduledDate,
        currentPlan: result.currentPlan,
        newPlan: result.newPlan,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/subscriptions/downgrade:
 *   post:
 *     summary: "Downgrade plan"
 *     description: "Downgrade plan for the merchant API."
 *     operationId: "merchant_post_api_v1_merchant_subscriptions_downgrade"
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
 *               $ref: "#/components/schemas/SuccessResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       409:
 *         description: "Business rule conflict"
 */
