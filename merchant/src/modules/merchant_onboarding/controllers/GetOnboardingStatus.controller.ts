import { NextFunction, Request, Response } from "express";
import { OK, INTERNAL_SERVER_ERROR } from "http-status";
import { MerchantOnboardingService } from "../MerchantOnboarding.service";
import { ERROR_CODES as errorCode } from "../../../constants/error-codes";

export const getOnboardingStatus = async (req: Request, res: Response, next: NextFunction) => {
  const { manageApplicationErrors, manageAsyncOps, user } = req.context;
  
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

  const [error, data] = await manageAsyncOps(
    MerchantOnboardingService.getOnboardingStatus(merchantId)
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
        errorCode: errorCode.BAD_REQUEST,
      })
    );
  }

  res.status(OK);
  res.response = {
    message: data.message,
    statusCode: OK,
    data: data.data,
  };

  return next();
};
/**
 * @swagger
 * /api/v1/merchant/onboarding/status:
 *   get:
 *     summary: "Get onboarding status"
 *     description: "Get onboarding status for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_onboarding_status"
 *     tags: ["Onboarding"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/OnboardingStatusResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 */
