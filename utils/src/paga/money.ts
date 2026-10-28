/**
 * Money helpers. We store integer kobo everywhere; Paga speaks naira decimals ("50.00").
 * All conversions use integer/string maths, never floating point, so 0.1 + 0.2 style errors cannot
 * creep into an amount that is hashed or compared.
 */

/** 5000 kobo -> "50.00". Throws for anything that is not a non-negative integer. */
export const koboToNairaString = (kobo: number): string => {
  if (typeof kobo !== "number" || !isFinite(kobo) || Math.floor(kobo) !== kobo || kobo < 0) {
    throw new Error("Amount in kobo must be a non-negative integer");
  }
  const naira = Math.floor(kobo / 100);
  const remainder = kobo % 100;
  return naira + "." + (remainder < 10 ? "0" : "") + remainder;
};

/** 5000 kobo -> 50 (a JSON number, for fields Paga types as a number). */
export const koboToNairaNumber = (kobo: number): number => parseFloat(koboToNairaString(kobo));

/**
 * "50.00" | "50.5" | 50 | 50.25 -> kobo. Rejects negatives, more than two decimals, commas and junk,
 * because an amount we cannot read exactly must never be treated as "close enough".
 */
export const nairaToKobo = (value: string | number): number => {
  let text: string;
  if (typeof value === "number") {
    if (!isFinite(value) || value < 0) throw new Error("Invalid naira amount");
    // A JSON number from Paga has at most two decimals; anything else is not a money value.
    const scaled = Math.round(value * 100);
    if (Math.abs(value * 100 - scaled) > 1e-6) throw new Error("Naira amount has more than two decimals");
    return scaled;
  }

  text = String(value).trim();
  // Paga writes a zero balance as ".00" (no leading digit); read that as 0.00
  if (/^\.\d{1,2}$/.test(text)) text = "0" + text;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error("Invalid naira amount: " + text);

  const parts = text.split(".");
  const fraction = ((parts[1] || "") + "00").slice(0, 2);
  return parseInt(parts[0], 10) * 100 + parseInt(fraction, 10);
};

/**
 * Lenient version for values READ FROM PAGA RESPONSES (fees, VAT, amounts shown back to us).
 * Returns null instead of throwing: after a payout has been accepted, a strangely formatted fee must never
 * turn a successful payout into an exception that a caller could mistake for a failure and refund.
 */
export const safeNairaToKobo = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;
  try {
    return nairaToKobo(value as string | number);
  } catch (_error) {
    return null;
  }
};
