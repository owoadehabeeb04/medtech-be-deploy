import { Request, Response, NextFunction } from "express";
import { MerchantSettingsService } from "../MerchantSettings.service";
import { validateSchema } from "@medtech/utils";
import { updateNotificationsSchema } from "../MerchantSettings.schema";

export const updateNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, user } = req.context;

  if (!user?.id) {
    return next(
      manageApplicationErrors({
        message: "Authentication required",
        statusCode: 401,
      })
    );
  }

  const merchantId: string = String(user.id);

  const cleanBody = sanitizeBody(req.body);
  const { error: validationError, value } = validateSchema(updateNotificationsSchema, cleanBody);

  if (validationError) {
    return next(
      manageApplicationErrors({
        message: validationError,
        statusCode: 400,
      })
    );
  }

  const [error, result] = await manageAsyncOps(
    MerchantSettingsService.updateNotifications(merchantId, value)
  );

  if (error) {
    return next(
      manageApplicationErrors({
        message: error.message,
        statusCode: 500,
      })
    );
  }

  return res.status(result.code).json({
    message: result.message,
    statusCode: result.code,
    data: result.data,
  });
};
/**
 * @swagger
 * /api/v1/merchant/settings/notifications:
 *   patch:
 *     summary: "Update notifications"
 *     description: "Update notifications for the merchant API."
 *     operationId: "merchant_patch_api_v1_merchant_settings_notifications"
 *     tags: ["Merchant Settings"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UpdateNotificationsRequest"
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UpdateNotificationsResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       409:
 *         description: "Business rule conflict"
 */
