import * as http from "http";
import * as https from "https";

export interface BrevoSmsConfig {
  apiKey: string;
  /** Alphanumeric sender name, at most 11 characters. Must be registered with Brevo for the destination country. */
  sender: string;
  baseUrl?: string;
  timeoutMs?: number;
}

/**
 * Transactional SMS through Brevo: POST /v3/transactionalSMS/send (the older /sms endpoint is deprecated).
 * Documented fields: sender (<= 11 alphanumeric characters), recipient (country code included, 6 to 15 digits),
 * content (over 160 characters is billed as several messages), type (defaults to transactional).
 */
export default class SendSms {
  private readonly apiKey: string;
  private readonly sender: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: BrevoSmsConfig) {
    this.apiKey = config.apiKey;
    this.sender = config.sender;
    this.baseUrl = config.baseUrl || "https://api.brevo.com";
    this.timeoutMs = config.timeoutMs || 15000;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.sender);
  }

  /** Resolves on a 2xx answer, rejects otherwise. `recipient` is E.164 (e.g. +2348031234567). */
  send(recipient: string, content: string, tag?: string): Promise<void> {
    if (!this.isConfigured()) {
      return Promise.reject(new Error("Brevo SMS is not configured. Set BREVO_API_KEY and BREVO_SMS_SENDER."));
    }
    const digits = String(recipient || "").replace(/\D/g, "");
    if (digits.length < 6 || digits.length > 15) {
      return Promise.reject(new Error("Invalid SMS recipient number."));
    }

    const payload = JSON.stringify({
      sender: this.sender,
      recipient: "+" + digits,
      content,
      type: "transactional",
      ...(tag ? { tag } : {}),
    });

    const url = new URL("/v3/transactionalSMS/send", this.baseUrl);
    const transport: typeof http | typeof https = url.protocol === "http:" ? http : https;

    return new Promise((resolve, reject) => {
      const request = transport.request(
        {
          method: "POST",
          hostname: url.hostname,
          port: url.port || (url.protocol === "https:" ? 443 : 80),
          path: url.pathname + url.search,
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
            "api-key": this.apiKey,
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
            let message = "Brevo SMS request failed (" + response.statusCode + ")";
            try {
              const parsed = JSON.parse(body);
              message = parsed.message || parsed.code || message;
            } catch {
              if (body) message = body.slice(0, 200);
            }
            reject(new Error(message));
          });
        }
      );
      request.setTimeout(this.timeoutMs, () => request.destroy(new Error("Brevo SMS request timed out")));
      request.on("error", reject);
      request.write(payload);
      request.end();
    });
  }
}
