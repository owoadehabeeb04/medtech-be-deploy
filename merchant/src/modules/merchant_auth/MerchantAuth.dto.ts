export interface SignupDTO {
  email: string;
  name: string;
}

export interface VerifyOtpDTO {
  email: string; 
  otp: string;
}

export interface ResendOtpDTO {
  email: string;
  purpose: "signup" | "reset-password";
}

export interface CheckPhoneDTO {
  phoneNumber: string;
  phoneCountryCode?: string;
}

export interface CompleteSignupDTO {
  email: string;
  businessName: string;
  phoneNumber: string;
  phoneCountryCode?: string;
  password: string;
  confirmPassword: string;
  licenseUrl?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  email: string; // Email to reset password for
  newPassword: string;
  confirmPassword: string;
}
