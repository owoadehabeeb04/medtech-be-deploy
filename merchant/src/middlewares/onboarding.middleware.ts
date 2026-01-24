import { Request, Response, NextFunction } from "express";
import { ERROR_CODES as errorCode } from "../constants/error-codes";

/**
 * Middleware to check if merchant has completed onboarding
 * Apply this to routes that require full merchant setup
 */
export const requireOnboarding = async (req: Request, res: Response, next: NextFunction) => {
  const { manageApplicationErrors } = req.context;
  const merchant = (req as any).merchant;

  if (!merchant) {
    return next(
      manageApplicationErrors({
        message: "Authentication required",
        statusCode: 401,
        errorCode: errorCode.UNAUTHORIZED,
      })
    );
  }

  if (!merchant.onboardingCompleted) {
    return res.status(403).json({
      status: false,
      code: 403,
      message: "Please complete your onboarding to access this feature",
      data: {
        currentStep: merchant.onboardingStep,
        onboardingUrl: "/api/v1/merchant/onboarding/status",
        completed: {
          terms: merchant.termsAccepted,
          validId: !!merchant.validIdUrl,
          profile: !!merchant.profilePictureUrl,
          bank: merchant.bankVerified,
        },
      },
    });
  }

  next();
};
