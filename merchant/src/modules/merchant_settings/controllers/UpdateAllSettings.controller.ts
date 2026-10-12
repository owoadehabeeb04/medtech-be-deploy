import { Request, Response, NextFunction } from "express";
import { MerchantSettingsService } from "../MerchantSettings.service";
import { validateSchema } from "@medtech/utils";
import { updateAllSettingsSchema } from "../MerchantSettings.schema";

export const updateAllSettings = async (
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
  const { error: validationError, value } = validateSchema(updateAllSettingsSchema, cleanBody);

  if (validationError) {
    return next(
      manageApplicationErrors({
        message: validationError,
        statusCode: 400,
      })
    );
  }

  const [error, result] = await manageAsyncOps(
    MerchantSettingsService.updateAllSettings(merchantId, value)
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
 * /api/v1/merchant/settings/all:
 *   patch:
 *     summary: "Update all settings"
 *     description: "Applies profile, store, payment, notification and preference changes in one call. If nothing could be saved, returns 400 with the real reason (for example a duplicate phone number or an address that cannot be found). If only some sections fail, returns 207 and lists each failure in data.errors and in the message."
 *     operationId: "merchant_patch_api_v1_merchant_settings_all"
 *     tags: ["Merchant Settings"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UpdateAllSettingsRequest"
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UpdateAllSettingsResponse"
 *       400:
 *         description: "Invalid request, or none of the requested changes could be saved (message explains why)"
 *       207:
 *         description: "Some sections were saved and others failed; see data.errors"
 *       401:
 *         description: "Authentication required"
 *       409:
 *         description: "Business rule conflict"
 */
