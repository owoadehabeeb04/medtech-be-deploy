import * as http from "http";
import * as https from "https";

export interface TwilioSmsConfig {
  accountSid: string;
  authToken: string;
  /** Twilio phone number or registered alphanumeric sender ID. */
  from?: string;
  /** Optional alternative to a fixed sender; uses the service's sender pool. */
  messagingServiceSid?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

/**
 * Transactional SMS through Twilio's Messages API. A successful request means
 * Twilio accepted the message; it does not confirm delivery to the handset.
 */
export default class SendSms {
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly from: string;
  private readonly messagingServiceSid: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: TwilioSmsConfig) {
    this.accountSid = config.accountSid.trim();
    this.authToken = config.authToken.trim();
    this.from = config.from?.trim() || "";
    this.messagingServiceSid = config.messagingServiceSid?.trim() || "";
    this.baseUrl = config.baseUrl || "https://api.twilio.com";
    this.timeoutMs = config.timeoutMs || 15000;
  }

  isConfigured(): boolean {
    return Boolean(this.accountSid && this.authToken && (this.from || this.messagingServiceSid));
  }

  /** Resolves on a 2xx answer, rejects otherwise. `recipient` is E.164 (e.g. +2348031234567). */
  send(recipient: string, content: string): Promise<void> {
    if (!this.isConfigured()) {
      return Promise.reject(new Error("Twilio SMS is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_SMS_FROM or TWILIO_MESSAGING_SERVICE_SID."));
    }
    if (!/^\+[1-9]\d{5,14}$/.test(recipient)) {
      return Promise.reject(new Error("Invalid SMS recipient number."));
    }

    const payload = new URLSearchParams({
      To: recipient,
      Body: content,
      ...(this.messagingServiceSid
        ? { MessagingServiceSid: this.messagingServiceSid }
        : { From: this.from }),
    }).toString();

    const url = new URL(`/2010-04-01/Accounts/${encodeURIComponent(this.accountSid)}/Messages.json`, this.baseUrl);
    const transport: typeof http | typeof https = url.protocol === "http:" ? http : https;

    return new Promise((resolve, reject) => {
      const request = transport.request(
        {
          method: "POST",
          hostname: url.hostname,
          port: url.port || (url.protocol === "https:" ? 443 : 80),
          path: url.pathname + url.search,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(payload),
            Authorization: "Basic " + Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64"),
            Accept: "application/json",
          },
        },
        (response) => {
          let body = "";
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.on("end", () => {
            if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) return resolve();
            let message = "Twilio SMS request failed (" + response.statusCode + ")";
            try {
              const parsed = JSON.parse(body);
              message = parsed.message ? `${message}: ${parsed.message}${parsed.code ? ` (code ${parsed.code})` : ""}` : message;
            } catch {
              if (body) message = body.slice(0, 200);
            }
            reject(new Error(message));
          });
          response.on("error", reject);
          response.on("aborted", () => reject(new Error("Twilio SMS response was interrupted")));
        }
      );
      request.setTimeout(this.timeoutMs, () => request.destroy(new Error("Twilio SMS request timed out")));
      request.on("error", reject);
      request.write(payload);
      request.end();
    });
  }
}
