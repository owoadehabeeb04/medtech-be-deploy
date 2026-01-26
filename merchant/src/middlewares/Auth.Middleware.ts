import { Request, Response, NextFunction } from "express";
import { UNAUTHORIZED } from "http-status";
import { verifyToken } from "@medtech/utils";
import { applicationConfig } from "../config";
import { ERROR_CODES as errorCode } from "../constants/error-codes";
import { Merchant } from "../modules/merchant/Merchant.model";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { manageApplicationErrors } = req.context;

  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(
        manageApplicationErrors({
          message: "Authentication required. Please provide a valid Bearer token in the Authorization header.",
          statusCode: UNAUTHORIZED,
        })
      );
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = verifyToken(token, {
      secret: applicationConfig.jwt.secret,
      expiresIn: applicationConfig.jwt.expiresIn,
    });

    if (!decoded) {
      return next(
        manageApplicationErrors({
          message: "Invalid or expired token",
          statusCode: UNAUTHORIZED,
        })
      );
    }

    // Check if merchant exists and is active
    const merchant = await Merchant.findOne({
      where: { id: decoded.id, isActive: true },
    });

    if (!merchant) {
      return next(
        manageApplicationErrors({
          message: "Merchant not found or inactive",
          statusCode: UNAUTHORIZED,
        })
      );
    }

    // Attach merchant info to request context
    req.context.user = {
      id: merchant.id,
      email: merchant.email,
      name: merchant.fullName,
    };

    // Also attach to req.merchant for backward compatibility
    (req as any).merchant = merchant;

    next();
  } catch (error) {
    return next(
      manageApplicationErrors({
        message: "Authentication failed",
        statusCode: UNAUTHORIZED,
      })
    );
  }
};
