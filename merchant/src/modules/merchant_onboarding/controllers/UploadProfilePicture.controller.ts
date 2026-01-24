import { NextFunction, Request, Response } from "express";
import { OK, BAD_REQUEST, INTERNAL_SERVER_ERROR } from "http-status";
import { MerchantOnboardingService } from "../MerchantOnboarding.service";
import { UploadProfilePictureSchema } from "../MerchantOnboarding.schema";
import { ERROR_CODES as errorCode } from "../../../constants/error-codes";

export const uploadProfilePicture = async (req: Request, res: Response, next: NextFunction) => {
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
  const { error: validationError, value: payload } = validateSchema(UploadProfilePictureSchema, cleanBody);

  if (validationError) {
    return next(
      manageApplicationErrors({
        message: validationError,
        statusCode: BAD_REQUEST,
      })
    );
  }

  const [error, data] = await manageAsyncOps(
    MerchantOnboardingService.uploadProfilePicture(merchantId, payload.profilePictureUrl)
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
