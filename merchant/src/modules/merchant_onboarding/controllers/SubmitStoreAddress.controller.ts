import { NextFunction, Request, Response } from "express";
import { OK, BAD_REQUEST, INTERNAL_SERVER_ERROR } from "http-status";
import { MerchantOnboardingService } from "../MerchantOnboarding.service";
import { StoreAddressSchema } from "../MerchantOnboarding.schema";
import { ERROR_CODES as errorCode } from "../../../constants/error-codes";

export const submitStoreAddress = async (req: Request, res: Response, next: NextFunction) => {
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
  const { error: validationError, value: payload } = validateSchema(StoreAddressSchema, cleanBody);

  if (validationError) {
    return next(
      manageApplicationErrors({
        message: validationError,
        statusCode: BAD_REQUEST,
      })
    );
  }

  const [error, data] = await manageAsyncOps(
    MerchantOnboardingService.submitStoreAddress(merchantId, payload)
  );

  if (error) {
    return next(
      manageApplicationErrors({
        message: error.message,
        statusCode: INTERNAL_SERVER_ERROR,
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
    message: data.message,
    statusCode: OK,
    data: data.data,
  };

  return res.status(OK).json(responsePayload);
};
/**
 * @swagger
 * /api/v1/merchant/onboarding/store-address:
 *   post:
 *     summary: "Submit store address"
 *     description: "Verifies the store address with Google Geocoding and saves it with its coordinates. Returns 400 if the address can't be found or is too general, and 503 if address verification is unavailable. Onboarding completes once the bank account and the store address are both verified."
 *     operationId: "merchant_post_api_v1_merchant_onboarding_store_address"
 *     tags: ["Onboarding"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/StoreAddressRequest"
 *     responses:
 *       200:
 *         description: "Address verified and saved"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/StoreAddressResponse"
 *       400:
 *         description: "Invalid request, or the address could not be found"
 *       401:
 *         description: "Authentication required"
 *       503:
 *         description: "Address verification is unavailable"
 */
