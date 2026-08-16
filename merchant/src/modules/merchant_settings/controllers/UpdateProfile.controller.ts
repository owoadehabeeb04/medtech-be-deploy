import { Request, Response, NextFunction } from "express";
import { MerchantSettingsService } from "../MerchantSettings.service";
import { validateSchema } from "@medtech/utils";
import { updateProfileSchema } from "../MerchantSettings.schema";

export const updateProfile = async (
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
  const { error: validationError, value } = validateSchema(updateProfileSchema, cleanBody);

  if (validationError) {
    return next(
      manageApplicationErrors({
        message: validationError,
        statusCode: 400,
      })
    );
  }

  const [error, result] = await manageAsyncOps(
    MerchantSettingsService.updateProfile(merchantId, value)
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
 * /api/v1/merchant/settings/profile:
 *   patch:
 *     summary: "Update profile"
 *     description: "Update profile for the merchant API."
 *     operationId: "merchant_patch_api_v1_merchant_settings_profile"
 *     tags: ["Merchant Settings"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UpdateProfileRequest"
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UpdateProfileResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       409:
 *         description: "Business rule conflict"
 */
