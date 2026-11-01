/** Online orders: 0.5% of the item subtotal before VAT, discounts or delivery, capped at NGN 250. */
export function calculateOnlineOrderServiceCharge(subtotal: number): number {
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    throw new RangeError("Order subtotal must be a finite, non-negative amount");
  }
  // Round to kobo first, then apply 1/200 and round the charge to the nearest kobo.
  const subtotalKobo = Math.round(subtotal * 100);
  return Math.min(Math.round(subtotalKobo / 200), 25000) / 100;
}
