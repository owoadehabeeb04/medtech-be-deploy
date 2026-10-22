import { Request, Response, NextFunction } from "express";
import { MerchantSettingsService } from "../MerchantSettings.service";
import { validateSchema } from "@medtech/utils";
import { updatePaymentSchema } from "../MerchantSettings.schema";

export const updatePayment = async (
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
  const { error: validationError, value } = validateSchema(updatePaymentSchema, cleanBody);

  if (validationError) {
    return next(
      manageApplicationErrors({
        message: validationError,
        statusCode: 400,
      })
    );
  }

  const [error, result] = await manageAsyncOps(
    MerchantSettingsService.updatePayment(merchantId, value)
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
 * /api/v1/merchant/settings/payment:
 *   patch:
 *     summary: "Update payment"
 *     description: "Saves the payout bank account after checking it with Paga: `bankCode` must be the `code` from GET /onboarding/banks (the bank's Paga UUID) and `accountName` must match the name the bank holds. Owner only. Same errors as POST /onboarding/verify-bank: 400 (not found, unknown bank, name mismatch), 429 (too many attempts), 503 (temporarily unavailable)."
 *     operationId: "merchant_patch_api_v1_merchant_settings_payment"
 *     tags: ["Merchant Settings"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UpdatePaymentRequest"
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UpdatePaymentResponse"
 *       400:
 *         description: "Invalid request, account not found, unknown bank, or account name mismatch"
 *       429:
 *         description: "Too many verification attempts for this merchant"
 *       503:
 *         description: "Bank verification is temporarily unavailable"
 *       401:
 *         description: "Authentication required"
 *       409:
 *         description: "Business rule conflict"
 */
