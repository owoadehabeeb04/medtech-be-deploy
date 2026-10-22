import { PagaConfig, resolveUrls, DEFAULT_TIMEOUT_MS } from "./config";
import { PagaError } from "./errors";
import { koboToNairaNumber, koboToNairaString, safeNairaToKobo } from "./money";
import { fetchTransport } from "./transport";

export const CHECKOUT_FUNDING_SOURCES = ["CARD", "PAGA", "TRANSFER", "AGENT", "USSD"];

export interface CheckoutLinkInput {
  amountKobo: number;
  email: string;
  /** Our own reference, persisted BEFORE the link is created. */
  paymentReference: string;
  /** Where the customer is sent after paying (a page on our domain that returns to the app). */
  chargeUrl?: string;
  /** Our backend webhook. */
  callbackUrl?: string;
  phoneNumber?: string;
  displayImage?: string;
  /** Subset of CHECKOUT_FUNDING_SOURCES, in preferred order. */
  fundingSources?: string[];
}

/**
 * Build a Paga Checkout link (docs: parameters are query-string values, not quoted).
 * The amount sits in the URL and is NOT signed by Paga, so never trust it later: verify the payment
 * with Paga and compare the amount to what we stored for this reference.
 */
export const buildCheckoutLink = (config: PagaConfig, input: CheckoutLinkInput): string => {
  const params: Array<[string, string]> = [
    ["public_key", config.publicKey],
    // UNCONFIRMED: documented as a Number; two decimals matches the decimal format used in hashes.
    ["amount", koboToNairaString(input.amountKobo)],
    ["email", input.email],
    ["currency", "NGN"],
    ["payment_reference", input.paymentReference],
  ];
  if (input.chargeUrl) params.push(["charge_url", input.chargeUrl]);
  if (input.callbackUrl) params.push(["callback_url", input.callbackUrl]);
  if (input.phoneNumber) params.push(["phone_number", input.phoneNumber]);
  if (input.displayImage) params.push(["display_image", input.displayImage]);
  if (input.fundingSources && input.fundingSources.length > 0) {
    for (let i = 0; i < input.fundingSources.length; i++) {
      if (CHECKOUT_FUNDING_SOURCES.indexOf(input.fundingSources[i]) === -1) {
        throw new Error("Unknown Paga funding source: " + input.fundingSources[i]);
      }
    }
    params.push(["funding_sources", input.fundingSources.join(",")]);
  }

  const query = params.map((pair) => encodeURIComponent(pair[0]) + "=" + encodeURIComponent(pair[1])).join("&");
  return resolveUrls(config).checkout + "/?" + query;
};

export type CheckoutVerifyStatus = "success" | "pending" | "failed";

/**
 * Ask Paga whether a Checkout payment really happened. status_code: 0 success, 2 pending,
 * 1 invalid transaction. Pending is NOT a failure: callers must keep waiting.
 */
export const verifyCheckoutPayment = async (
  config: PagaConfig,
  input: { paymentReference: string; amountKobo: number }
): Promise<{ status: CheckoutVerifyStatus; statusCode: number; chargeId: string | null; paidAmountKobo: number | null; message: string }> => {
  const transport = config.transport || fetchTransport;
  // UNCONFIRMED: docs say "Basic" without saying what is encoded; publicKey:secretKey is the standard form.
  const credentials = Buffer.from(config.publicKey + ":" + config.secretKey, "utf8").toString("base64");

  const response = await transport({
    method: "POST",
    url: resolveUrls(config).checkoutVerify,
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: "Basic " + credentials },
    body: {
      paymentReference: input.paymentReference,
      publicKey: config.publicKey,
      amount: koboToNairaNumber(input.amountKobo),
      currency: "NGN",
    },
    timeoutMs: config.timeoutMs || DEFAULT_TIMEOUT_MS,
  });

  if (response.status >= 500) {
    throw new PagaError("Paga Checkout verify error (" + response.status + ")", { kind: "network", httpStatus: response.status, outcomeUnknown: true });
  }
  if (response.status === 401 || (response.body && Number(response.body.status_code) === 401)) {
    throw new PagaError("Paga rejected our credentials", { kind: "api", code: 401, httpStatus: response.status, outcomeUnknown: false });
  }
  if (!response.body || typeof response.body !== "object") {
    throw new PagaError("Unreadable response from Paga", { kind: "invalid_response", httpStatus: response.status, outcomeUnknown: true });
  }

  const statusCode = Number(response.body.status_code);
  const paidAmountKobo = safeNairaToKobo(response.body.amount);

  return {
    status: statusCode === 0 ? "success" : statusCode === 2 ? "pending" : "failed",
    statusCode,
    chargeId: response.body.chargeId ? String(response.body.chargeId) : null,
    paidAmountKobo,
    message: String(response.body.status_message || ""),
  };
};
