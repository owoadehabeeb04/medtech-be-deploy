export interface AcceptTermsDTO {
  accepted: boolean;
}

export interface VerifyBankDTO {
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

export interface OnboardingStatusDTO {
  completed: boolean;
  currentStep: number;
  steps: {
    terms: StepStatus;
    validId: StepStatus;
    profile: StepStatus;
    bank: StepStatus;
  };
}

interface StepStatus {
  completed: boolean;
  required: boolean;
  url?: string;
  verified?: boolean;
}
