import { HttpException } from "@medtech/utils";

export const BARCODE_PATTERN = /^[\x21-\x7E]+$/;
export const BARCODE_MAX_LENGTH = 100;
export const BARCODE_UNIQUE_INDEX = "products_merchant_barcode_unique";

/** Preserve leading zeroes and case. Scanners may append surrounding whitespace. */
export function normalizeBarcode(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new HttpException(400, "Barcode must be a string");
  const barcode = value.trim();
  if (!barcode || barcode.length > BARCODE_MAX_LENGTH || !BARCODE_PATTERN.test(barcode)) {
    throw new HttpException(400, "Barcode must contain 1 to 100 printable characters without spaces");
  }
  return barcode;
}

export function rethrowBarcodeConflict(error: any): never {
  if (error?.name === "SequelizeUniqueConstraintError" &&
      (error?.parent?.constraint === BARCODE_UNIQUE_INDEX || error?.original?.constraint === BARCODE_UNIQUE_INDEX ||
        Object.prototype.hasOwnProperty.call(error?.fields || {}, "barcode"))) {
    throw new HttpException(409, "This barcode is already assigned to another product in your pharmacy");
  }
  throw error;
}
