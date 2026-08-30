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
 *     summary: Register a merchant web notification device
 *     tags: [Merchant Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/RegisterMerchantDeviceTokenRequest"
 *     responses:
 *       200:
 *         description: Notification device registered
 *       400:
 *         description: Invalid device token payload
 *       401:
 *         description: Authentication required
 */
