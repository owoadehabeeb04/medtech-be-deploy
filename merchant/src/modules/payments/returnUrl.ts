import { HttpException } from "@medtech/utils";
import { applicationConfig } from "../../config";

/**
 * Where Paga sends the customer after paying (`charge_url`). Never trust the browser's redirect for the outcome:
 * the page this URL points to must call our confirm endpoint with `reference`.
 *
 * A caller may suggest a URL, but only on an origin we have allowed; otherwise we use the merchant web app's /callback page.
 */
export const resolveChargeUrl = (reference: string, flow: string, requestedReturnUrl?: string): string => {
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

  url.searchParams.set("reference", reference);
  url.searchParams.set("flow", flow);
  return url.toString();
};
