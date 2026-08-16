import { NextFunction, Request, Response } from "express";
import { OK, BAD_REQUEST, INTERNAL_SERVER_ERROR } from "http-status";
import { MerchantOnboardingService } from "../MerchantOnboarding.service";
import { UploadValidIdSchema } from "../MerchantOnboarding.schema";
import { ERROR_CODES as errorCode } from "../../../constants/error-codes";

export const uploadValidId = async (req: Request, res: Response, next: NextFunction) => {
  const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody2, user } = req.context;
  
  if (!user?.id) {
    return next(
      manageApplicationErrors({
        message: "Authentication required",
        statusCode: 401,
        errorCode: errorCode.UNAUTHORIZED,
      })
    );
  }

  const merchantId: string = String(user.id);

  const cleanBody = sanitizeBody2(req.body);
  const { error: validationError, value: payload } = validateSchema(UploadValidIdSchema, cleanBody);

  if (validationError) {
    return next(
      manageApplicationErrors({
        message: validationError,
        statusCode: BAD_REQUEST,
        errorCode: errorCode.BAD_REQUEST,
      })
    );
  }

  const [error, data] = await manageAsyncOps(
    MerchantOnboardingService.uploadValidId(merchantId, payload.validIdUrl)
  );

  if (error) {
    return next(
      manageApplicationErrors({
        message: error.message,
        statusCode: INTERNAL_SERVER_ERROR,
        errorCode: errorCode.INTERNAL_SERVER_ERROR,
      })
    );
  }

  if (!data.status) {
    return next(
      manageApplicationErrors({
        message: data.message,
        statusCode: data.code,
      })
    );
  }

  const responsePayload = {
    status: data.code,
    message: data.message,
    data: data.data,
  };

  return res.status(data.code).json(responsePayload);
};
/**
 * @swagger
 * /api/v1/merchant/onboarding/upload-valid-id:
 *   post:
 *     summary: "Upload valid ID"
 *     description: "Upload valid ID for the merchant API."
 *     operationId: "merchant_post_api_v1_merchant_onboarding_upload_valid_id"
 *     tags: ["Onboarding"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UploadValidIdRequest"
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UploadValidIdResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       409:
 *         description: "Business rule conflict"
 */
