import { SendSms } from "@medtech/utils";
import { applicationConfig } from "../../config";
import { Merchant } from "../../modules/merchant/Merchant.model";
import { normalizePhone } from "../../modules/merchant/phone.util";
import { MerchantSettings } from "../../modules/merchant_settings/MerchantSettings.model";
import { EmailService } from "../Email/Email.service";
import { FirebaseMessagingService, MerchantPushEvent } from "../Firebase/FirebaseMessaging.service";

export type NotifyEvent = MerchantPushEvent;

export interface NotifyInput {
  merchantId: string;
  event: NotifyEvent;
  title: string;
  /** Used for the desktop push and as the email's main sentence. */
  body: string;
  /** Short plain-text version for SMS. Keep it ASCII and under 160 characters (a naira sign would force Unicode billing). */
  smsText: string;
  /** Extra lines shown in the email. */
  details?: string[];
  data: Record<string, string | number | boolean | null | undefined>;
  link?: string;
}

const sms = new SendSms({
  apiKey: applicationConfig.brevo.apiKey,
  sender: applicationConfig.brevo.smsSender,
  baseUrl: applicationConfig.brevo.baseUrl || undefined,
});

/** "NGN 12,500" for SMS (no naira sign), from kobo or naira. */
export const smsMoney = (naira: number) => "NGN " + Number(naira).toLocaleString("en-NG", { maximumFractionDigits: 2 });

/**
 * One call for every merchant alert. Sends on up to three channels, each only if the merchant switched it on for
 * this event (Settings, Notification Settings), and each independently: one channel failing never blocks another
 * and never throws into the code that triggered the alert. Email and SMS go to the pharmacy owner only.
 */
export class NotificationService {
  static async notify(input: NotifyInput): Promise<void> {
    const channels: Array<Promise<unknown>> = [
      FirebaseMessagingService.sendEvent({
        merchantId: input.merchantId,
        event: input.event,
        title: input.title,
        body: input.body,
        data: input.data,
        ...(input.link ? { link: input.link } : {}),
      }).catch((error: any) => console.error(`[Notify] push failed (${input.event}):`, error?.message || error)),
      this.emailAndSms(input).catch((error: any) => console.error(`[Notify] email/sms failed (${input.event}):`, error?.message || error)),
    ];
    await Promise.all(channels);
  }

  private static async emailAndSms(input: NotifyInput): Promise<void> {
    const [settings, merchant] = await Promise.all([
      MerchantSettings.findOne({ where: { merchantId: input.merchantId } }),
      Merchant.findByPk(input.merchantId),
    ]);
    if (!settings || !merchant) return;

    const preference = settings.notificationPreferences?.[input.event];
    const tasks: Array<Promise<unknown>> = [];

    if (preference?.email === true && merchant.email) {
      tasks.push(
        EmailService.sendNotificationEmail(merchant.email, {
          title: input.title,
          message: input.body,
          details: input.details,
          ctaUrl: applicationConfig.team.merchantAppUrl,
          ctaLabel: "Open QuickMedic",
        }).catch((error: any) => console.error(`[Notify] email not sent (${input.event}):`, error?.message || error))
      );
    }

    if (preference?.sms === true) {
      if (!sms.isConfigured()) {
        console.warn(`[Notify] SMS is switched on for ${input.event} but BREVO_SMS_SENDER is not set; skipped`);
      } else if (merchant.phoneNumber) {
        const phone = normalizePhone(merchant.phoneCountryCode, merchant.phoneNumber);
        tasks.push(
          sms
            .send("+" + phone.countryCode + phone.national, input.smsText, input.event)
            .catch((error: any) => console.error(`[Notify] SMS not sent (${input.event}):`, error?.message || error))
        );
      }
    }

    await Promise.all(tasks);
  }
}
