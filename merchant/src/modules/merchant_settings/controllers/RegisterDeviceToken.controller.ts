import { NextFunction, Request, Response } from "express";
import { validateSchema } from "@medtech/utils";
import { MerchantDeviceTokenService } from "../MerchantDeviceToken.service";
import { registerMerchantDeviceTokenSchema } from "../MerchantDeviceToken.schema";

export const registerDeviceToken = async (
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

    const cleanBody = req.context.sanitizeBody(req.body);
    const { error, value } = validateSchema(
      registerMerchantDeviceTokenSchema,
      cleanBody
    );
    if (error) {
      res.status(400);
      res.response = { statusCode: 400, message: error };
      return next();
    }

    const data = await MerchantDeviceTokenService.register(merchantId, value);

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Notification device registered successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/v1/merchant/settings/device-token:
 *   post:
 *     summary: Register or refresh a merchant web-push device
 *     description: >
 *       Call this after the merchant grants browser permission and Firebase getToken()
 *       returns a token. Use a stable frontend-generated deviceId for the browser
 *       profile; posting the same deviceId is an upsert and refreshes its FCM token.
 *       Call it again whenever Firebase provides a new token. The stored token is
 *       never returned by this API.
 *     operationId: merchant_register_web_push_device
 *     tags: [Merchant Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/RegisterMerchantDeviceTokenRequest"
 *           examples:
 *             chromeBrowser:
 *               summary: Register the current Chrome browser profile
 *               value:
 *                 deviceId: a5ce5631-351c-4a86-9b58-c5523f738d61
 *                 token: fcm-web-registration-token
 *                 platform: web
 *                 browser: Chrome
 *                 userAgent: Mozilla/5.0 ... Chrome/140.0
 *     responses:
 *       200:
 *         description: Notification device registered or refreshed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RegisterMerchantDeviceTokenResponse"
 *             examples:
 *               registered:
 *                 value:
 *                   status: 200
 *                   message: Notification device registered successfully
 *                   data:
 *                     id: 1c17dca0-645d-4fd9-b0bc-0bc1f23c1a38
 *                     deviceId: a5ce5631-351c-4a86-9b58-c5523f738d61
 *                     platform: web
 *                     browser: Chrome
 *                     isActive: true
 *                     lastSeenAt: 2026-08-30T13:55:00.000Z
 *       400:
 *         description: Invalid device token payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       401:
 *         description: Authentication required
 */
