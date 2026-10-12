import { NextFunction, Request, Response } from "express";
import { CREATED, INTERNAL_SERVER_ERROR, BAD_REQUEST } from "http-status";
import { ResendOtpSchema } from "../MerchantAuth.schema";
import { MerchantAuthService } from "../MerchantAuth.service";
import { ERROR_CODES as errorCode } from "../../../constants/error-codes";

export const resendOtp = async (req: Request, res: Response, next: NextFunction) => {
  const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody2 } = req.context;

  const cleanBody = sanitizeBody2(req.body);
  const { error: validationError, value: payload } = validateSchema(ResendOtpSchema, cleanBody);

  if (validationError) {
    return next(
      manageApplicationErrors({
        message: validationError,
        statusCode: BAD_REQUEST,
        errorCode: errorCode.BAD_REQUEST,
      })
    );
  }

  const [error, data] = await manageAsyncOps(MerchantAuthService.resendOtp(payload, req));

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
        statusCode: data.code || BAD_REQUEST,
      })
    );
  }

  const responsePayload = {
    status: data.code,
    message: data.message,
    data: data.data,
  };

  return res.status(data.code).json(responsePayload);

  return next();
};
/**
 * @swagger
 * /api/v1/merchant/auth/resend-otp:
 *   post:
 *     summary: "Resend OTP"
 *     description: "Sends a fresh verification code for the signup or password-reset flow. The previous code stops working. Returns 429 if a code was sent in the last 30 seconds."
 *     operationId: "merchant_post_api_v1_merchant_auth_resend_otp"
 *     tags: ["Authentication"]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ResendOtpRequest"
 *     responses:
 *       200:
 *         description: "A new code was sent"
 *       400:
 *         description: "No pending signup for this email, or the email is already registered/verified"
 *       429:
 *         description: "Too many requests; wait before requesting another code"
 */
