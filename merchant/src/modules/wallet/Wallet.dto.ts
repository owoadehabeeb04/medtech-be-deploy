export interface FundWalletDTO {
  amount: number; // in naira — service converts to kobo
}

export interface ConfirmFundingDTO {
  reference: string;
}

export interface PaySubscriptionDTO {
  planId: string;
}
