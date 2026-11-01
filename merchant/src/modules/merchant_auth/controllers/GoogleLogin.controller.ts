import { NextFunction, Request, Response } from "express";
import { GoogleLoginSchema } from "../MerchantAuth.schema";
import { MerchantAuthService } from "../MerchantAuth.service";

/**
 * @swagger
 * /api/v1/merchant/auth/google:
 *   post:
 *     summary: Sign in or register using Firebase Google authentication
 *     description: Send the Firebase user.getIdToken() value after Google sign-in. Existing owners/staff receive the usual session or pharmacy-selection response. New users receive requiresRegistration until registration is supplied; registering creates a pharmacy owner with incomplete onboarding. The verified Google email identifies the local account. No client-supplied email or permissions are accepted.
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             additionalProperties: false
 *             properties:
 *               idToken: { type: string, maxLength: 16384, description: Firebase ID token, not a Google access token }
 *               pharmacyCode: { type: string, maxLength: 20, description: Existing staff/owners selecting an invited pharmacy only }
 *               registration:
 *                 type: object
 *                 required: [businessName, phoneNumber]
 *                 additionalProperties: false
 *                 properties:
 *                   businessName: { type: string, minLength: 2, maxLength: 200 }
 *                   phoneNumber: { type: string, minLength: 10, maxLength: 15 }
 *                   phoneCountryCode: { type: string, example: '+234' }
 *                   licenseUrl: { type: string, format: uri }
 *     responses:
 *       200: { description: Existing merchant session, pharmacy selection, or requiresRegistration with verified email }
 *       201: { description: Pharmacy owner registered; usual merchant session and incomplete onboarding returned }
 *       400: { description: Invalid request }
 *       401: { description: Invalid, expired, revoked, unverified, disabled, or non-Google Firebase sign-in }
 *       403: { description: Local account inactive or pharmacy access denied }
 *       409: { description: Account email or phone conflicts }
 *       429: { description: Too many sign-in requests }
 *       503: { description: Firebase Admin configuration missing or unavailable }
 */
export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
  const { validateSchema, manageAsyncOps, manageApplicationErrors } = req.context;
  const { error: validationError, value: payload } = validateSchema(GoogleLoginSchema, req.body);
  if (validationError) return next(manageApplicationErrors({ message: validationError, statusCode: 400 }));
  const [error, result] = await manageAsyncOps(MerchantAuthService.googleLogin(payload, req));
  if (error) return next(manageApplicationErrors({ message: "Google sign-in failed. Please try again.", statusCode: 500 }));
  if (!result.status) return next(manageApplicationErrors({ message: result.message, statusCode: result.code }));
  return res.status(result.code).json({ status: result.code, message: result.message, data: result.data });
};
