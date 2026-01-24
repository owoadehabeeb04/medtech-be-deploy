import { NextFunction, Request, Response } from "express";
import { OK, INTERNAL_SERVER_ERROR, BAD_REQUEST } from "http-status";
import { MerchantOnboardingService } from "../MerchantOnboarding.service";
import { AcceptTermsSchema } from "../MerchantOnboarding.schema";
import { ERROR_CODES as errorCode } from "../../../constants/error-codes";

export const acceptTerms = async (req: Request, res: Response, next: NextFunction) => {
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
  const { error: validationError, value: payload } = validateSchema(AcceptTermsSchema, cleanBody);

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
    MerchantOnboardingService.acceptTerms(merchantId, payload)
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
