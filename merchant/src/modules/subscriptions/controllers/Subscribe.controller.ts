import { Request, Response, NextFunction } from "express";
import { SubscriptionService } from "../Subscription.service";
import { validateSchema } from "@medtech/utils";
import { subscribeSchema } from "../Subscription.schema";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.context;

    if (!user?.id) {
      res.status(401);
      res.response = { message: "Authentication required", statusCode: 401 };
      return next();
    }

    const { error, value } = validateSchema(subscribeSchema, req.body);
    if (error) {
      res.status(400);
      res.response = { message: error, statusCode: 400 };
      return next();
    }

    const result = await SubscriptionService.subscribe(
      String(user.id),
      value.planId,
      value.paymentMethod,
      value.returnUrl
    );

    res.status(200);
    res.response = {
      message: "Subscription initiated successfully",
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
 * /api/v1/merchant/subscriptions/subscribe:
 *   post:
 *     summary: "Subscribe"
 *     description: "Subscribe for the merchant API."
 *     operationId: "merchant_post_api_v1_merchant_subscriptions_subscribe"
 *     tags: ["Subscriptions"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/SubscribeRequest"
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SubscribeResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       409:
 *         description: "Business rule conflict"
 */
