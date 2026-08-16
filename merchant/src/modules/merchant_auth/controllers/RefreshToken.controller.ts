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
/**
 * @swagger
 * /api/v1/merchant/auth/refresh-token:
 *   post:
 *     summary: "Refresh token"
 *     description: "Refresh token for the merchant API."
 *     operationId: "merchant_post_api_v1_merchant_auth_refresh_token"
 *     tags: ["Authentication"]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/RefreshTokenRequest"
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RefreshTokenResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication or signature rejected"
 *       409:
 *         description: "Business rule conflict"
 */
