import { NextFunction, Request, Response } from "express";
import { OK, BAD_REQUEST, INTERNAL_SERVER_ERROR } from "http-status";
import { MerchantOnboardingService } from "./MerchantOnboarding.service";
import { UploadValidIdSchema, UploadProfilePictureSchema, VerifyBankSchema } from "./MerchantOnboarding.schema";
import { ERROR_CODES as errorCode } from "../../constants/error-codes";

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

export const uploadValidId = async (req: Request, res: Response, next: NextFunction) => {
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
  const { error: validationError, value: payload } = validateSchema(UploadValidIdSchema, cleanBody);

  if (validationError) {
    return next(
      manageApplicationErrors({
        message: validationError,
        statusCode: BAD_REQUEST,
      })
    );
  }

  const [error, data] = await manageAsyncOps(
    MerchantOnboardingService.uploadValidId(merchantId, payload.validIdUrl)
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
