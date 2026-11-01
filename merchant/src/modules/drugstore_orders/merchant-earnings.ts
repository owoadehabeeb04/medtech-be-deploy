type Amount = string | number | null | undefined;

export type MerchantOrderAmounts = {
  totalAmount: Amount;
  vatTotal?: Amount;
  serviceCharge?: Amount;
};

const amount = (value: Amount): number => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

/** Discounted item sales plus the pharmacy's delivery fee, before any separate commission. */
export const calculateMerchantOrderEarnings = (order: MerchantOrderAmounts): number =>
  Number((amount(order.totalAmount) - amount(order.vatTotal) - amount(order.serviceCharge)).toFixed(2));
