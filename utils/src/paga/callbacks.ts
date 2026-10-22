import { hashesMatch, pagaHash } from "./hash";
import { koboToNairaString, nairaToKobo } from "./money";

/**
 * Verifiers for the three callback types Paga sends. Each returns { valid, reason }.
 * A valid hash proves the sender knows our hash key; it does NOT prove the payment is real or the
 * amount is right, so callers must still verify with Paga and compare the amount to what they expected.
 */
export interface CallbackVerdict {
  valid: boolean;
  reason?: string;
}

const asAmountString = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    // The docs say the amount is hashed "in decimal format as returned in the callback", e.g. 50.00
    return koboToNairaString(nairaToKobo(value));
  }
  return String(value);
};

/** Checkout -> callback_url. Hash = SHA512(amount + timeStamp + paymentReference + HMAC key). */
export const verifyCheckoutCallback = (payload: any, hashKey: string): CallbackVerdict => {
  if (!payload || typeof payload !== "object") return { valid: false, reason: "empty payload" };
  const amount = asAmountString(payload.amount);
  if (amount === null || !payload.timeStamp || !payload.paymentReference) {
    return { valid: false, reason: "missing amount, timeStamp or paymentReference" };
  }
  const expected = pagaHash([amount, payload.timeStamp, payload.paymentReference], hashKey);
  return hashesMatch(expected, payload.hash) ? { valid: true } : { valid: false, reason: "hash mismatch" };
};

/**
 * Collect payment request / direct debit -> callBackUrl.
 * Hash = SHA512(notificationId + statusCode + externalReferenceNumber + state + outstandingBalance + hashKey);
 * outstandingBalance is omitted when null, otherwise two decimals with no commas.
 */
export const verifyCollectCallback = (payload: any, hashKey: string): CallbackVerdict => {
  if (!payload || typeof payload !== "object") return { valid: false, reason: "empty payload" };
  if (!payload.notificationId || payload.externalReferenceNumber === undefined) {
    return { valid: false, reason: "missing notificationId or externalReferenceNumber" };
  }
  const parts: Array<string | number | null | undefined> = [
    payload.notificationId,
    payload.statusCode,
    payload.externalReferenceNumber,
    payload.state,
  ];
  const balance = asAmountString(payload.outstandingBalance);
  if (balance !== null) parts.push(balance);

  return hashesMatch(pagaHash(parts, hashKey), payload.hash) ? { valid: true } : { valid: false, reason: "hash mismatch" };
};

/** The only hash-parameter list we accept for deposit-to-bank callbacks (documented). */
export const BUSINESS_CALLBACK_PARAMETERS = "referenceNumber,transactionDate,transactionId,amount,sessionId,hashKey";

/**
 * depositToBank -> statusCallbackUrl. Headers: x-paga-hash-parameters and x-paga-hash.
 * The parameter list arrives in a header the sender controls, so we DO NOT build the hash from it;
 * we require it to equal the documented list and hash exactly those fields ourselves.
 */
export const verifyBusinessCallback = (headers: { [name: string]: any }, payload: any, hashKey: string): CallbackVerdict => {
  if (!payload || typeof payload !== "object") return { valid: false, reason: "empty payload" };

  const lower: { [name: string]: any } = {};
  Object.keys(headers || {}).forEach((name) => {
    lower[name.toLowerCase()] = headers[name];
  });

  const declared = String(lower["x-paga-hash-parameters"] || "").replace(/\s+/g, "");
  if (declared !== BUSINESS_CALLBACK_PARAMETERS) return { valid: false, reason: "unexpected hash parameter list" };

  const amount = asAmountString(payload.amount);
  if (amount === null || !payload.referenceNumber || !payload.transactionDate || !payload.transactionId || !payload.sessionId) {
    return { valid: false, reason: "missing required callback fields" };
  }

  const expected = pagaHash(
    [payload.referenceNumber, payload.transactionDate, payload.transactionId, amount, payload.sessionId],
    hashKey
  );
  return hashesMatch(expected, lower["x-paga-hash"]) ? { valid: true } : { valid: false, reason: "hash mismatch" };
};
