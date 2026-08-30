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
 *     summary: Remove a merchant web notification device
 *     tags: [Merchant Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification device removed
 *       400:
 *         description: Missing device ID
 *       401:
 *         description: Authentication required
 */
