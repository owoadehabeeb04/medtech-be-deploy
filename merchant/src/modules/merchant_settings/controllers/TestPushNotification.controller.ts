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
 *     summary: Send a test web-push notification
 *     description: >
 *       Sends a test notification to every active browser device registered for the
 *       authenticated merchant. There is no request body. Push must be enabled,
 *       at least one device must be active, and Firebase Admin must be configured.
 *       The response explains a skipped delivery with push_disabled,
 *       no_active_devices, or firebase_not_configured. Event-level preferences do
 *       not block this test.
 *     operationId: merchant_send_web_push_test
 *     tags: [Merchant Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test delivery result; inspect data.skipped when sent is zero
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MerchantPushTestResponse"
 *             examples:
 *               sent:
 *                 value:
 *                   status: 200
 *                   message: Test notification sent
 *                   data:
 *                     provider: firebase
 *                     event: test
 *                     attempted: 1
 *                     sent: 1
 *                     failed: 0
 *                     invalidTokens: 0
 *               skippedNoDevice:
 *                 value:
 *                   status: 200
 *                   message: "Test notification was not sent: no_active_devices"
 *                   data:
 *                     provider: firebase
 *                     event: test
 *                     attempted: 0
 *                     sent: 0
 *                     failed: 0
 *                     invalidTokens: 0
 *                     skipped: no_active_devices
 *       401:
 *         description: Authentication required
 */
