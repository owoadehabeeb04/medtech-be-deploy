import { NextFunction, Request, Response } from "express";
import { CREATED, INTERNAL_SERVER_ERROR, BAD_REQUEST } from "http-status";
import { CompleteSignupSchema } from "../MerchantAuth.schema";
import { MerchantAuthService } from "../MerchantAuth.service";
import { ERROR_CODES as errorCode } from "../../../constants/error-codes";

export const completeSignup = async (req: Request, res: Response, next: NextFunction) => {
  const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody2 } = req.context;

  const cleanBody = sanitizeBody2(req.body);
  const { error: validationError, value: payload } = validateSchema(CompleteSignupSchema, cleanBody);

  if (validationError) {
    return next(
      manageApplicationErrors({
        message: validationError,
        statusCode: BAD_REQUEST,
        errorCode: errorCode.BAD_REQUEST,
      })
    );
  }

  const [error, data] = await manageAsyncOps(MerchantAuthService.completeSignup(payload));

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
};
/**
 * @swagger
 * /api/v1/merchant/auth/complete-signup:
 *   post:
 *     summary: "Complete signup"
 *     description: "Creates the merchant account after the email OTP was verified. A phone number can only be registered once: 0803…, 803… and +234803… are treated as the same number."
 *     operationId: "merchant_post_api_v1_merchant_auth_complete_signup"
 *     tags: ["Authentication"]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CompleteSignupRequest"
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CompleteSignupResponse"
 *       400:
 *         description: "Invalid request, OTP not verified, or the email/phone number is already registered (message: Phone number has already been registered)"
 *       401:
 *         description: "Authentication or signature rejected"
 *       409:
 *         description: "Business rule conflict"
 */
