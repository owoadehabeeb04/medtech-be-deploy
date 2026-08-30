import { Op } from "sequelize";
import { MerchantDeviceToken } from "./MerchantDeviceToken.model";

export interface RegisterMerchantDeviceTokenInput {
  deviceId: string;
  token: string;
  platform: "web";
  browser?: string | null;
  userAgent?: string | null;
}

const serializeToken = (deviceToken: MerchantDeviceToken) => ({
  id: deviceToken.id,
  deviceId: deviceToken.deviceId,
  platform: deviceToken.platform,
  browser: deviceToken.browser,
  isActive: deviceToken.isActive,
  lastSeenAt: deviceToken.lastSeenAt,
});

export class MerchantDeviceTokenService {
  static async register(
    merchantId: string,
    input: RegisterMerchantDeviceTokenInput
  ) {
    const now = new Date();
    const values = {
      merchantId,
      deviceId: input.deviceId.trim(),
      token: input.token.trim(),
      platform: "web" as const,
      browser: input.browser?.trim() || null,
      userAgent: input.userAgent?.trim() || null,
      isActive: true,
      lastSeenAt: now,
      lastErrorAt: null as Date | null,
      lastErrorCode: null as string | null,
    };

    let deviceToken = await MerchantDeviceToken.findOne({
      where: { merchantId, deviceId: values.deviceId },
    });

    if (deviceToken) {
      await deviceToken.update(values);
    } else {
      try {
        deviceToken = await MerchantDeviceToken.create(values);
      } catch (error: any) {
        // A concurrent registration can win the unique merchant/device key.
        if (error?.name !== "SequelizeUniqueConstraintError") throw error;

        deviceToken = await MerchantDeviceToken.findOne({
          where: { merchantId, deviceId: values.deviceId },
        });
        if (!deviceToken) throw error;
        await deviceToken.update(values);
      }
    }

    // A browser token should never remain active for another merchant. This
    // prevents a token reused after logout from receiving the wrong merchant's
    // notifications.
    await MerchantDeviceToken.update(
      {
        isActive: false,
        lastErrorAt: now,
        lastErrorCode: "token_reassigned",
      },
      {
        where: {
          token: values.token,
          id: { [Op.ne]: deviceToken.id },
        },
      }
    );

    return serializeToken(deviceToken);
  }

  static async deactivate(merchantId: string, deviceId: string) {
    const [updatedCount] = await MerchantDeviceToken.update(
      {
        isActive: false,
        lastSeenAt: new Date(),
      },
      {
        where: { merchantId, deviceId: deviceId.trim() },
      }
    );

    return { deactivated: updatedCount > 0 };
  }

  static async countActive(merchantId: string) {
    return MerchantDeviceToken.count({
      where: { merchantId, isActive: true },
    });
  }
}
