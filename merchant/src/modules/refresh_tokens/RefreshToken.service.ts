import { RefreshToken } from "./RefreshToken.model";
import { Merchant } from "../merchant/Merchant.model";
import { StoreDetails } from "../store_details/StoreDetails.model";
import { PaymentDetails } from "../payment_details/PaymentDetails.model";
import { MerchantMember } from "../team/MerchantMember.model";
import { MerchantSettings } from "../merchant_settings/MerchantSettings.model";
import { hashPassword } from "@medtech/utils";
import { generateRefreshToken, verifyRefreshToken, generateToken, type RefreshTokenPayload } from "@medtech/utils";
import { applicationConfig } from "../../config";
import { Op } from "sequelize";
import * as crypto from "crypto";

export class RefreshTokenService {
  static async createRefreshToken(
    merchantId: string,
    deviceInfo?: string,
    ipAddress?: string,
    memberId?: string | null
  ): Promise<{ refreshToken: string; tokenId: string }> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const tokenString = crypto.randomBytes(64).toString("hex");

    const hashedToken = await hashPassword(tokenString);

    const refreshTokenRecord = await RefreshToken.create({
      merchantId,
      token: hashedToken,
      expiresAt,
      isActive: true,
      deviceInfo: deviceInfo || null,
      ipAddress: ipAddress || null,
      memberId: memberId || null,
    });

    const merchant = await Merchant.findByPk(merchantId, { attributes: ["email"] });
    
    const jwtRefreshToken = generateRefreshToken(
      {
        id: merchantId,
        email: merchant?.email || "",
        type: "merchant",
        tokenId: refreshTokenRecord.id,
      },
      {
        secret: applicationConfig.jwt.secret,
        expiresIn: applicationConfig.jwt.expiresIn,
        refreshSecret: applicationConfig.jwt.refreshSecret,
        refreshExpiresIn: applicationConfig.jwt.refreshExpiresIn,
      }
    );

    return {
      refreshToken: jwtRefreshToken,
      tokenId: refreshTokenRecord.id,
    };
  }

  static async refreshAccessToken(
    refreshTokenString: string
  ): Promise<{ accessToken: string; refreshToken: string; merchant: any }> {
    const decoded = verifyRefreshToken(refreshTokenString, {
      secret: applicationConfig.jwt.secret,
      expiresIn: applicationConfig.jwt.expiresIn,
      refreshSecret: applicationConfig.jwt.refreshSecret,
      refreshExpiresIn: applicationConfig.jwt.refreshExpiresIn,
    });

    if (!decoded || !decoded.tokenId) {
      throw new Error("Invalid refresh token");
    }

    const refreshTokenRecord = await RefreshToken.findOne({
      where: {
        id: decoded.tokenId,
        merchantId: decoded.id,
        isActive: true,
      },
      include: [{ model: Merchant, as: "merchant" }],
    });

    if (!refreshTokenRecord) {
      throw new Error("Refresh token not found or revoked");
    }

    if (refreshTokenRecord.isExpired) {
      await refreshTokenRecord.update({ isActive: false });
      throw new Error("Refresh token has expired");
    }

    const merchant = await Merchant.findByPk(decoded.id, {
      include: [
        { model: StoreDetails, as: "storeDetails" },
        { model: PaymentDetails, as: "paymentDetails" },
        { model: MerchantSettings, as: "settings" },
      ],
    });

    if (!merchant || !merchant.isActive) {
      throw new Error("Merchant not found or inactive");
    }

    // A session opened as a team member must stay a member session, and only while the
    // membership is still active (removal/suspension kills the session).
    let memberId: string | null = null;
    if (refreshTokenRecord.memberId) {
      const member = await MerchantMember.findOne({
        where: { id: refreshTokenRecord.memberId, merchantId: merchant.id, status: "active" },
      });
      if (!member) {
        await refreshTokenRecord.update({ isActive: false });
        throw new Error("Your access to this pharmacy has been removed or suspended");
      }
      memberId = member.id;
    }

    const accessToken = generateToken(
      {
        id: merchant.id,
        email: merchant.email,
        type: "merchant",
        ...(memberId ? { memberId } : {}),
      } as any,
      {
        secret: applicationConfig.jwt.secret,
        expiresIn: applicationConfig.jwt.expiresIn,
        otpExpiration: applicationConfig.otpExpiration,
      }
    );

    return {
      accessToken,
      refreshToken: refreshTokenString,
      merchant: {
        id: merchant.id,
        email: merchant.email,
        firstName: merchant.firstName,
        lastName: merchant.lastName,
        fullName: merchant.fullName,
        businessName: merchant.storeDetails?.businessName,
        phoneNumber: merchant.phoneNumber,
        isVerified: merchant.isVerified,
      },
    };
  }

  static async revokeRefreshToken(tokenId: string, merchantId: string): Promise<void> {
    await RefreshToken.update(
      { isActive: false },
      {
        where: {
          id: tokenId,
          merchantId,
        },
      }
    );
  }

  /** Kill every session a team member has opened, e.g. when they are suspended or removed. */
  static async revokeMemberSessions(memberId: string): Promise<void> {
    await RefreshToken.update({ isActive: false }, { where: { memberId, isActive: true } });
  }

  static async revokeAllRefreshTokens(merchantId: string): Promise<void> {
    await RefreshToken.update(
      { isActive: false },
      {
        where: {
          merchantId,
          isActive: true,
        },
      }
    );
  }

  static async cleanupExpiredTokens(): Promise<number> {
    const result = await RefreshToken.update(
      { isActive: false },
      {
        where: {
          expiresAt: {
            [Op.lt]: new Date(),
          },
          isActive: true,
        },
      }
    );
    return result[0];
  }
}
