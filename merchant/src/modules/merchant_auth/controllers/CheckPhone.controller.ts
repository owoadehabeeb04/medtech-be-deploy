import { NextFunction, Request, Response } from "express";
import { CREATED, INTERNAL_SERVER_ERROR, BAD_REQUEST } from "http-status";
import { CheckPhoneSchema } from "../MerchantAuth.schema";
import { MerchantAuthService } from "../MerchantAuth.service";
import { ERROR_CODES as errorCode } from "../../../constants/error-codes";

export const checkPhone = async (req: Request, res: Response, next: NextFunction) => {
  const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody2 } = req.context;

  const cleanBody = sanitizeBody2(req.body);
  const { error: validationError, value: payload } = validateSchema(CheckPhoneSchema, cleanBody);

  if (validationError) {
    return next(
      manageApplicationErrors({
        message: validationError,
        statusCode: BAD_REQUEST,
        errorCode: errorCode.BAD_REQUEST,
      })
    );
  }

  const [error, data] = await manageAsyncOps(MerchantAuthService.checkPhone(payload));

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
 * /api/v1/merchant/auth/check-phone:
 *   post:
 *     summary: "Check phone availability"
 *     description: "Lets the signup form validate a phone number before submitting. The same number written as 0803…, 803… or +234803… counts as one number."
 *     operationId: "merchant_post_api_v1_merchant_auth_check_phone"
 *     tags: ["Authentication"]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CheckPhoneRequest"
 *     responses:
 *       200:
 *         description: "Phone number is available"
 *       400:
 *         description: "Phone number has already been registered"
 */
