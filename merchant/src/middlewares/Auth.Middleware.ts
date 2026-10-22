import { Request, Response, NextFunction } from "express";
import { UNAUTHORIZED } from "http-status";
import { verifyToken } from "@medtech/utils";
import { applicationConfig } from "../config";
import { ERROR_CODES as errorCode } from "../constants/error-codes";
import { Merchant } from "../modules/merchant/Merchant.model";
import { AccessService } from "../modules/team/Access.service";
import { ALL_PERMISSIONS, expandPermissions } from "../constants/permissions";

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

    // The token's id is the PHARMACY being acted on. For the owner that is their own merchant.
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

    const memberId = (decoded as any).memberId as string | undefined;

    if (!memberId) {
      // Owner acting on their own pharmacy: full access, behaviour unchanged.
      req.context.user = {
        id: merchant.id,
        email: merchant.email,
        name: merchant.fullName,
        actor: "owner",
        permissions: [...ALL_PERMISSIONS],
      };
    } else {
      // A team member acting at this pharmacy: resolve their role on every request so that
      // role edits, suspension and removal take effect immediately.
      const member = await AccessService.loadActiveMember(memberId, merchant.id);
      if (!member) {
        return next(
          manageApplicationErrors({
            message: "Your access to this pharmacy has been removed or suspended",
            statusCode: UNAUTHORIZED,
          })
        );
      }

      req.context.user = {
        id: merchant.id,
        email: member.person.email,
        name: member.person.name,
        actor: "member",
        memberId: member.id,
        roleId: member.role.id,
        roleName: member.role.name,
        permissions: expandPermissions(member.role.permissions),
        principal: { kind: member.person.kind, id: member.person.id },
      };
    }

    // Also attach to req.merchant for backward compatibility (this is the PHARMACY's merchant row)
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
