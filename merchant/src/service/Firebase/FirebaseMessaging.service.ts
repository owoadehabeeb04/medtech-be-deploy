import {
  App,
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import {
  getMessaging,
  Messaging,
  MulticastMessage,
} from "firebase-admin/messaging";
import { Op } from "sequelize";
import { applicationConfig } from "../../config";
import { MerchantDeviceToken } from "../../modules/merchant_settings/MerchantDeviceToken.model";
import { MerchantSettings } from "../../modules/merchant_settings/MerchantSettings.model";

export type MerchantPushEvent =
  | "orderPlaced"
  | "walletFunded"
  | "offlineSaleRecorded";

type PushData = Record<string, string | number | boolean | null | undefined>;

export interface PushSendResult {
  provider: "firebase";
  event: MerchantPushEvent | "test";
  attempted: number;
  sent: number;
  failed: number;
  invalidTokens: number;
  skipped?: "push_disabled" | "event_disabled" | "no_active_devices" | "firebase_not_configured";
}

interface SendPushInput {
  merchantId: string;
  event: MerchantPushEvent | "test";
  title: string;
  body: string;
  data: PushData;
  link?: string;
  respectEventPreference?: boolean;
}

const MAX_MULTICAST_TOKENS = 500;

const normalizeData = (data: PushData): Record<string, string> =>
  Object.entries(data).reduce<Record<string, string>>((result, [key, value]) => {
    if (value !== undefined && value !== null) result[key] = String(value);
    return result;
  }, {});

const normalizePrivateKey = (privateKey: string) =>
  privateKey.replace(/\\n/g, "\n");

const isInvalidTokenError = (code?: string) =>
  code === "messaging/registration-token-not-registered" ||
  code === "messaging/invalid-registration-token";

export class FirebaseMessagingService {
  private static initialized = false;
  private static firebaseApp: App | null = null;
  private static initializationError: string | null = null;

  private static hasExplicitCredentials() {
    const { projectId, clientEmail, privateKey, serviceAccountJson } =
      applicationConfig.firebase;

    return Boolean(
      serviceAccountJson || (projectId && clientEmail && privateKey)
    );
  }

  private static isApplicationDefaultAvailable() {
    return Boolean(
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.K_SERVICE
    );
  }

  private static getFirebaseMessaging(): Messaging | null {
    if (this.initialized) {
      return this.firebaseApp ? getMessaging(this.firebaseApp) : null;
    }

    this.initialized = true;

    try {
      const existingApp = getApps()[0];
      if (existingApp) {
        this.firebaseApp = existingApp;
        return getMessaging(existingApp);
      }

      const firebaseConfig = applicationConfig.firebase;
      let credential;

      if (firebaseConfig.serviceAccountJson) {
        const serviceAccount = JSON.parse(firebaseConfig.serviceAccountJson);
        credential = cert({
          projectId: serviceAccount.project_id || firebaseConfig.projectId,
          clientEmail: serviceAccount.client_email || firebaseConfig.clientEmail,
          privateKey: normalizePrivateKey(
            serviceAccount.private_key || firebaseConfig.privateKey
          ),
        });
      } else if (
        firebaseConfig.projectId &&
        firebaseConfig.clientEmail &&
        firebaseConfig.privateKey
      ) {
        credential = cert({
          projectId: firebaseConfig.projectId,
          clientEmail: firebaseConfig.clientEmail,
          privateKey: normalizePrivateKey(firebaseConfig.privateKey),
        });
      } else if (this.isApplicationDefaultAvailable()) {
        credential = applicationDefault();
      } else {
        this.initializationError =
          "Firebase credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.";
        console.warn(`[Push] ${this.initializationError}`);
        return null;
      }

      this.firebaseApp = initializeApp({
        credential,
        ...(firebaseConfig.projectId
          ? { projectId: firebaseConfig.projectId }
          : {}),
      });

      return getMessaging(this.firebaseApp);
    } catch (error: any) {
      this.initializationError = error?.message || "Firebase initialization failed";
      console.error("[Push] Firebase initialization failed:", this.initializationError);
      return null;
    }
  }

  static getStatus() {
    // Initialise lazily here so the status endpoint reports whether Firebase
    // Admin can actually be used, rather than only whether environment values
    // happen to be present.
    const messaging = this.getFirebaseMessaging();

    return {
      provider: "firebase" as const,
      configured: Boolean(messaging),
      initializationError: this.initializationError,
    };
  }

  static async sendEvent(input: Omit<SendPushInput, "respectEventPreference">) {
    return this.sendToMerchant({
      ...input,
      respectEventPreference: true,
    });
  }

  static async sendTestNotification(merchantId: string) {
    return this.sendToMerchant({
      merchantId,
      event: "test",
      title: "QuickMedic notifications are working",
      body: "This is a test notification from your merchant account.",
      data: { type: "notification_test" },
      respectEventPreference: false,
    });
  }

  private static async sendToMerchant(
    input: SendPushInput
  ): Promise<PushSendResult> {
    const settings = await MerchantSettings.findOne({
      where: { merchantId: input.merchantId },
    });

    const baseResult: PushSendResult = {
      provider: "firebase",
      event: input.event,
      attempted: 0,
      sent: 0,
      failed: 0,
      invalidTokens: 0,
    };

    if (!settings?.pushNotificationsEnabled) {
      return { ...baseResult, skipped: "push_disabled" };
    }

    if (input.respectEventPreference && input.event !== "test") {
      const preference = settings.notificationPreferences?.[input.event];
      if (preference?.desktop === false) {
        return { ...baseResult, skipped: "event_disabled" };
      }
    }

    const devices = await MerchantDeviceToken.findAll({
      where: { merchantId: input.merchantId, isActive: true },
      order: [["lastSeenAt", "DESC"]],
    });

    if (devices.length === 0) {
      return { ...baseResult, skipped: "no_active_devices" };
    }

    const messaging = this.getFirebaseMessaging();
    if (!messaging) {
      return {
        ...baseResult,
        attempted: devices.length,
        skipped: "firebase_not_configured",
      };
    }

    const normalizedData = normalizeData({
      ...input.data,
      type: input.data.type || input.event,
    });
    const invalidDeviceIds: string[] = [];
    let sent = 0;
    let failed = 0;

    for (let index = 0; index < devices.length; index += MAX_MULTICAST_TOKENS) {
      const batch = devices.slice(index, index + MAX_MULTICAST_TOKENS);
      const message: MulticastMessage = {
        tokens: batch.map((device) => device.token),
        notification: {
          title: input.title,
          body: input.body,
        },
        data: normalizedData,
        webpush: {
          notification: {
            title: input.title,
            body: input.body,
          },
          ...(input.link ? { fcmOptions: { link: input.link } } : {}),
        },
      };

      try {
        const response = await messaging.sendEachForMulticast(message);

        response.responses.forEach((result, responseIndex) => {
          if (result.success) {
            sent += 1;
            return;
          }

          failed += 1;
          const errorCode = result.error?.code;
          if (isInvalidTokenError(errorCode)) {
            invalidDeviceIds.push(batch[responseIndex].id);
          }
        });
      } catch (error: any) {
        failed += batch.length;
        console.error(
          `[Push] Firebase send failed for event=${input.event}, merchant=${input.merchantId}:`,
          error?.message || error
        );
      }
    }

    if (invalidDeviceIds.length > 0) {
      await MerchantDeviceToken.update(
        {
          isActive: false,
          lastErrorAt: new Date(),
          lastErrorCode: "registration-token-not-registered",
        },
        {
          where: { id: { [Op.in]: invalidDeviceIds } },
        }
      );
    }

    const result: PushSendResult = {
      ...baseResult,
      attempted: devices.length,
      sent,
      failed,
      invalidTokens: invalidDeviceIds.length,
    };

    console.log(
      `[Push] event=${input.event} merchant=${input.merchantId} attempted=${result.attempted} sent=${result.sent} failed=${result.failed} invalid=${result.invalidTokens}`
    );

    return result;
  }
}
