import * as crypto from "crypto";

/**
 * Paga signs requests and callbacks with SHA-512 over the listed values concatenated in order, with the
 * business hash key last (docs: "hashed with SHA-512 algorithm of the appended params containing(...)").
 *
 * UNCONFIRMED WITH PAGA (all three are isolated here so one edit fixes them everywhere):
 *  1. output encoding: the docs never say; callback samples are 128 hex characters, so lowercase hex.
 *  2. separators: none documented, so values are joined directly.
 *  3. an absent optional value is treated as an empty string.
 */
export type HashPart = string | number | null | undefined;

const ENCODING: "hex" = "hex";

export const sha512 = (value: string): string => crypto.createHash("sha512").update(value, "utf8").digest(ENCODING);

export const pagaHash = (parts: HashPart[], hashKey: string): string => {
  if (!hashKey) throw new Error("Paga hash key is not configured");
  let joined = "";
  for (let i = 0;  i < parts.length; i++) {
    const part = parts[i];
    joined += part === null || part === undefined ? "" : String(part);
  }
  return sha512(joined + hashKey);
};

/** Constant-time comparison of two hashes (case-insensitive, length-safe). */
export const hashesMatch = (expected: string, received: unknown): boolean => {
  if (typeof received !== "string" || received.length === 0) return false;
  const a = Buffer.from(expected.toLowerCase(), "utf8");
  const b = Buffer.from(received.trim().toLowerCase(), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};
