import { NextFunction, Request, Response } from "express";
import { MerchantDeviceTokenService } from "../MerchantDeviceToken.service";
import { MerchantSettings } from "../MerchantSettings.model";
import { FirebaseMessagingService } from "../../../service/Firebase/FirebaseMessaging.service";

export const getPushNotificationStatus = async (
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

    const settings = await MerchantSettings.findOne({ where: { merchantId } });
    const activeDeviceCount = await MerchantDeviceTokenService.countActive(merchantId);

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Push notification status retrieved successfully",
      data: {
        provider: "firebase",
        firebase: FirebaseMessagingService.getStatus(),
        pushNotificationsEnabled: Boolean(settings?.pushNotificationsEnabled),
        activeDeviceCount,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/v1/merchant/settings/notifications/push-status:
 *   get:
 *     summary: Get merchant web-push readiness
 *     description: >
 *       Use this after registering a browser token, or when showing a notification
 *       settings screen. firebase.configured confirms that this backend process can
 *       use Firebase Admin; activeDeviceCount confirms registrations for the current
 *       merchant. Browser permission and service-worker state remain frontend concerns.
 *     operationId: merchant_get_web_push_status
 *     tags: [Merchant Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Push notification configuration and device status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MerchantPushStatusResponse"
 *             examples:
 *               ready:
 *                 value:
 *                   status: 200
 *                   message: Push notification status retrieved successfully
 *                   data:
 *                     provider: firebase
 *                     firebase:
 *                       provider: firebase
 *                       configured: true
 *                       initializationError: null
 *                     pushNotificationsEnabled: true
 *                     activeDeviceCount: 1
 *       401:
 *         description: Authentication required
 */
