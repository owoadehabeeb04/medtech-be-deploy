import { NextFunction, Request, Response } from "express";
import { OK, INTERNAL_SERVER_ERROR, BAD_REQUEST } from "http-status";
import { MerchantOnboardingService } from "../MerchantOnboarding.service";
import { VerifyBankSchema } from "../MerchantOnboarding.schema";
import { ERROR_CODES as errorCode } from "../../../constants/error-codes";

export const verifyBankAccount = async (req: Request, res: Response, next: NextFunction) => {
  const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, user } = req.context;
  
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

  const cleanBody = sanitizeBody(req.body);
  const { error: validationError, value: payload } = validateSchema(VerifyBankSchema, cleanBody);

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
    MerchantOnboardingService.verifyBankAccount(merchantId, payload)
  );

  if (error) {
    const statusCode = error.message?.includes("Could not resolve") || 
                       error.message?.includes("verification failed") 
                       ? BAD_REQUEST : INTERNAL_SERVER_ERROR;
    return next(
      manageApplicationErrors({
        message: error.message || "Failed to verify bank account",
        statusCode: statusCode,
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
 * /api/v1/merchant/onboarding/verify-bank:
 *   post:
 *     summary: "Verify bank account"
 *     description: "Checks the account with Paga and compares the account holder's name with `accountName` (case, spacing and punctuation are ignored; a close match is accepted). `bankCode` must be exactly the `code` returned by GET /onboarding/banks (with Paga it is the bank's UUID). 400: the account was not found, the bank is unknown, or the name does not match (the response then shows the name the bank holds). 429: too many attempts, wait as the message says. 503: bank verification is temporarily unavailable; retrying is safe. Onboarding only completes once the store address is verified too (POST /onboarding/store-address); until then the response has onboardingCompleted: false."
 *     operationId: "merchant_post_api_v1_merchant_onboarding_verify_bank"
 *     tags: ["Onboarding"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/VerifyBankAccountRequest"
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/VerifyBankResponse"
 *       400:
 *         description: "Invalid request, account not found, unknown bank, or account name mismatch"
 *       429:
 *         description: "Too many verification attempts for this merchant"
 *       502:
 *         description: "The payment provider returned an unexpected answer"
 *       503:
 *         description: "Bank verification is temporarily unavailable"
 *       401:
 *         description: "Authentication required"
 *       409:
 *         description: "Business rule conflict"
 */
