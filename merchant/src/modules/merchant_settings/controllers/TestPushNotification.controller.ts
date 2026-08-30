import { NextFunction, Request, Response } from "express";
import { FirebaseMessagingService } from "../../../service/Firebase/FirebaseMessaging.service";

export const sendTestPushNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const merchantId = String(req.context.user?.id || "").trim();
    if (!merchantId) {
      res.status(401);
      res.response = {
        statusCode: 401,
        message: "Authentication required",
      };
      return next();
    }

    const data = await FirebaseMessagingService.sendTestNotification(merchantId);

    res.status(200);
    res.response = {
      statusCode: 200,
      message: data.skipped
        ? `Test notification was not sent: ${data.skipped}`
        : "Test notification sent",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/v1/merchant/settings/notifications/test:
 *   post:
 *     summary: Send a test push notification to the merchant's active devices
 *     tags: [Merchant Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test result
 *       401:
 *         description: Authentication required
 */
