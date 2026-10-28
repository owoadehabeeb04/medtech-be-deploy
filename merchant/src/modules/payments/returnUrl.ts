import { HttpException } from "@medtech/utils";
import { applicationConfig } from "../../config";

/**
 * Where Paga sends the customer after paying (`charge_url`). Paga adds its own parameters to this address
 * (`charge_reference`, `status_message`, `status_code`; the reference is the one we sent as payment_reference),
 * so we add none of our own: the page reads `charge_reference` and must call our confirm endpoint with it.
 * Never trust the redirect for the outcome.
 *
 * A caller may suggest a URL, but only on an origin we have allowed; otherwise we use the merchant web app's /callback page.
 */
export const resolveChargeUrl = (requestedReturnUrl?: string): string => {
  const candidate = (requestedReturnUrl || "").trim();
  let url: URL;

  if (candidate) {
    try {
      url = new URL(candidate);
    } catch {
      throw new HttpException(400, "Invalid payment return URL.");
    }
    const allowed = applicationConfig.allowedPaymentReturnOrigins || [];
    if (allowed.indexOf(url.origin) === -1) {
      throw new HttpException(400, "Payment return URL origin is not allowed.");
    }
  } else {
    url = new URL("/callback", applicationConfig.team.merchantAppUrl);
  }

  return url.toString();
};
