import { NextFunction, Request, Response } from "express";
import { MerchantDeviceTokenService } from "../MerchantDeviceToken.service";

export const removeDeviceToken = async (
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

    const deviceId = String(req.params.deviceId || "").trim();
    if (!deviceId) {
      res.status(400);
      res.response = {
        statusCode: 400,
        message: "deviceId is required",
      };
      return next();
    }

    const data = await MerchantDeviceTokenService.deactivate(merchantId, deviceId);

    res.status(200);
    res.response = {
      statusCode: 200,
      message: data.deactivated
        ? "Notification device removed successfully"
        : "Notification device was already inactive",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/v1/merchant/settings/device-tokens/{deviceId}:
 *   delete:
 *     summary: Deactivate a merchant web-push device
 *     description: >
 *       Call this on merchant logout or when browser notifications are disabled.
 *       It deactivates only the supplied browser profile for the authenticated
 *       merchant. It is idempotent: a successful response with deactivated false
 *       means the device was already inactive or was not registered.
 *     operationId: merchant_deactivate_web_push_device
 *     tags: [Merchant Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         description: The same stable browser-profile ID previously sent to POST /device-token.
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *         example: a5ce5631-351c-4a86-9b58-c5523f738d61
 *     responses:
 *       200:
 *         description: Notification device deactivated or already inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RemoveMerchantDeviceTokenResponse"
 *             examples:
 *               deactivated:
 *                 value:
 *                   status: 200
 *                   message: Notification device removed successfully
 *                   data:
 *                     deactivated: true
 *       400:
 *         description: Missing device ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       401:
 *         description: Authentication required
 */
