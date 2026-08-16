import { NextFunction, Request, Response } from "express";
import { OK, INTERNAL_SERVER_ERROR, BAD_REQUEST } from "http-status";
import { ForgotPasswordSchema } from "../MerchantAuth.schema";
import { MerchantAuthService } from "../MerchantAuth.service";
import { ERROR_CODES as errorCode } from "../../../constants/error-codes";

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody2 } = req.context;

  const cleanBody = sanitizeBody2(req.body);
  const { error: validationError, value: payload } = validateSchema(ForgotPasswordSchema, cleanBody);

  if (validationError) {
    return next(
      manageApplicationErrors({
        message: validationError,
        statusCode: BAD_REQUEST,
        errorCode: errorCode.BAD_REQUEST,
      })
    );
  }

  const [error, data] = await manageAsyncOps(MerchantAuthService.forgotPassword(payload, req));

  if (error) {
    return next(
      manageApplicationErrors({
        message: error.message,
        statusCode: INTERNAL_SERVER_ERROR,
        errorCode: errorCode.INTERNAL_SERVER_ERROR,
      })
    );
  }

  res.status(data.code);
  res.response = {
    message: data.message,
    statusCode: data.code,
    data: data.data,
  };

  return next();
};
/**
 * @swagger
 * /api/v1/merchant/auth/forgot-password:
 *   post:
 *     summary: "Forgot password"
 *     description: "Forgot password for the merchant API."
 *     operationId: "merchant_post_api_v1_merchant_auth_forgot_password"
 *     tags: ["Authentication"]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ForgotPasswordRequest"
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ForgotPasswordResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication or signature rejected"
 *       409:
 *         description: "Business rule conflict"
 */
