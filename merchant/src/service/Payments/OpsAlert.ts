import { applicationConfig } from "../../config";
import { EmailService } from "../Email/Email.service";

const lastSent = new Map<string, number>();
const REPEAT_AFTER_MS = 60 * 60 * 1000;

/**
 * Tell the team something needs a human (Paga balance low, a payout stuck or reversed). Always logged;
 * emailed when OPS_ALERT_EMAIL is set. The same alert (same key) is sent at most once an hour so a
 * repeating problem does not flood the inbox. Never throws: an alert failing must not break a payment.
 */
export const alertOps = async (key: string, title: string, details: string): Promise<void> => {
  console.error(`[OpsAlert] ${title} :: ${details}`);
  const to = applicationConfig.withdrawals.opsAlertEmail;
  if (!to) return;

  const now = Date.now();
  if (now - (lastSent.get(key) || 0) < REPEAT_AFTER_MS) return;
  lastSent.set(key, now);

  try {
    await EmailService.sendOpsAlertEmail(to, { title, details });
  } catch (error) {
    console.error("[OpsAlert] could not send email:", (error as Error).message);
  }
};
