import { Request, Response, NextFunction } from "express";
import { SubscriptionService } from "../Subscription.service";
import { PaystackService } from "../../../service/Paystack/Paystack.service";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers["x-paystack-signature"] as string;
    if (!signature) {
      res.status(400);
      res.response = { message: "Missing signature", statusCode: 400 };
      return next();
    }

    const rawBody = req.rawBody || JSON.stringify(req.body);
    const isValid = PaystackService.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      res.status(401);
      res.response = { message: "Invalid signature", statusCode: 401 };
      return next();
    }

    const { event, data } = req.body;
    await SubscriptionService.handleWebhook(event, data);

    // Paystack expects 200 response quickly
    res.status(200);
    res.response = { message: "Webhook received", statusCode: 200 };
    return next();
  } catch (error) {
    // Return a non-2xx response when processing fails so Paystack can retry.
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/subscriptions/webhook:
 *   post:
 *     summary: "Webhook"
 *     description: "Paystack webhook for subscription payments, automatic wallet-funding settlement, and wallet-withdrawal reconciliation. Configure Paystack to call this endpoint; wallet funding is credited on charge.success."
 *     operationId: "merchant_post_api_v1_merchant_subscriptions_webhook"
 *     tags: ["Subscriptions"]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/PaystackWebhookRequest"
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
 *         description: "Authentication or signature rejected"
 *       409:
 *         description: "Business rule conflict"
 */
