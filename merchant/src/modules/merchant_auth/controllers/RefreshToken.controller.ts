import { Request, Response, NextFunction } from "express";
import { RefreshTokenService } from "../../refresh_tokens/RefreshToken.service";
import { validateSchema } from "@medtech/utils";
import Joi from "joi";

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "any.required": "Refresh token is required",
  }),
});

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody } = req.context;

  const cleanBody = sanitizeBody(req.body);
  const { error: validationError, value } = validateSchema(refreshTokenSchema, cleanBody);

  if (validationError) {
    return next(
      manageApplicationErrors({
        message: validationError,
        statusCode: 400,
      })
    );
  }

  const { refreshToken: refreshTokenString } = value;

  const [error, result] = await manageAsyncOps(
    RefreshTokenService.refreshAccessToken(refreshTokenString)
  );

  if (error) {
    return next(
      manageApplicationErrors({
        message: error.message || "Invalid or expired refresh token",
        statusCode: 401,
      })
    );
  }

  return res.status(200).json({
    status: 200,
    message: "Token refreshed successfully",
    data: {
      token: result.accessToken,
      refreshToken: result.refreshToken,
      merchant: result.merchant,
    },
  });
};
