import { Request, Response, NextFunction } from "express";
import { SubscriptionService } from "../Subscription.service";
import { validateSchema } from "@medtech/utils";
import { toggleAutoRenewSchema } from "../Subscription.schema";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.context;

    if (!user?.id) {
      res.status(401);
      res.response = { message: "Authentication required", statusCode: 401 };
      return next();
    }

    const { error, value } = validateSchema(toggleAutoRenewSchema, req.body);
    if (error) {
      res.status(400);
      res.response = { message: error, statusCode: 400 };
      return next();
    }

    const result = await SubscriptionService.toggleAutoRenew(
      String(user.id),
      value.autoRenew
    );

    res.status(200);
    res.response = {
      message: result.message,
      statusCode: 200,
      data: { autoRenew: result.autoRenew },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/subscriptions/auto-renew:
 *   patch:
 *     summary: "Toggle auto renew"
 *     description: "Toggle auto renew for the merchant API."
 *     operationId: "merchant_patch_api_v1_merchant_subscriptions_auto_renew"
 *     tags: ["Subscriptions"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ToggleAutoRenewRequest"
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ToggleAutoRenewResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       409:
 *         description: "Business rule conflict"
 */
