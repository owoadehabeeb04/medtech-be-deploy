import { NextFunction, Request, Response } from "express";
import { OK, INTERNAL_SERVER_ERROR, UNAUTHORIZED, BAD_REQUEST } from "http-status";
import { LoginSchema } from "../MerchantAuth.schema";
import { MerchantAuthService } from "../MerchantAuth.service";
import { ERROR_CODES as errorCode } from "../../../constants/error-codes";

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody2 } = req.context;

  const cleanBody = sanitizeBody2(req.body);
  const { error: validationError, value: payload } = validateSchema(LoginSchema, cleanBody);

  if (validationError) {
    return next(
      manageApplicationErrors({
        message: validationError,
        statusCode: BAD_REQUEST,
        errorCode: errorCode.BAD_REQUEST,
      })
    );
  }

  const [error, data] = await manageAsyncOps(MerchantAuthService.login(payload, req));

  if (error) {
    console.log(error);
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
        statusCode: data.code || UNAUTHORIZED,
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
