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
