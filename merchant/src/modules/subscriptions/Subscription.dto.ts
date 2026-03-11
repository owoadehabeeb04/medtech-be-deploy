import { PaymentMethod } from "../../constants/enums";

export interface SubscribeDTO {
  planId: string;
  paymentMethod: PaymentMethod;
}

export interface UpgradePlanDTO {
  planId: string;
  paymentMethod: PaymentMethod;
}

export interface DowngradePlanDTO {
  planId: string;
}

export interface ToggleAutoRenewDTO {
  autoRenew: boolean;
}

export interface ConfirmPaymentDTO {
  reference: string;
}
