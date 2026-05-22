export interface FundWalletDTO {
  amount: number; // in naira — service converts to kobo
}

export interface WithdrawWalletDTO {
  amount: number; // in naira — service converts to kobo
  reason?: string;
}

export interface ConfirmFundingDTO {
  reference: string;
}

export interface PaySubscriptionDTO {
  planId: string;
}
