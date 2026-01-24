import jwt from "jsonwebtoken";

export interface JWTPayload {
  id: string;
  email: string;
  type: "merchant";
}

export interface OTPFlowPayload {
  email: string;
  name?: string;
  path: "signup" | "reset-password";
  step: "otp-sent" | "otp-verified";
  otpHash?: string;
}

export interface JWTConfig {
  secret: string;
  expiresIn: string;
  otpExpiration?: number;
  refreshSecret?: string;
  refreshExpiresIn?: string;
}

export const generateToken = (payload: JWTPayload, config: JWTConfig): string => {
  if (!config.secret) {
    throw new Error("JWT secret is not configured");
  }
  return jwt.sign(payload, config.secret, {
    expiresIn: config.expiresIn,
  } as jwt.SignOptions);
};

export const generateOTPFlowToken = (payload: OTPFlowPayload, config: JWTConfig): string => {
  if (!config.secret) {
    throw new Error("JWT secret is not configured");
  }
  const expiration = config.otpExpiration || 10;
  return jwt.sign(payload, config.secret, {
    expiresIn: `${expiration}m`,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string, config: JWTConfig): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, config.secret) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const verifyOTPFlowToken = (token: string, config: JWTConfig): OTPFlowPayload | null => {
  try {
    const decoded = jwt.verify(token, config.secret) as OTPFlowPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export interface RefreshTokenPayload {
  id: string;
  email: string;
  type: "merchant";
  tokenId: string; // UUID of the refresh token record
}

export const generateRefreshToken = (payload: RefreshTokenPayload, config: JWTConfig): string => {
  if (!config.refreshSecret || config.refreshSecret.trim() === "" || config.refreshSecret === "change-me-refresh-token-secret") {
    throw new Error("Refresh token secret is not configured. Please set JWT_REFRESH_SECRET environment variable.");
  }
  return jwt.sign(payload, config.refreshSecret, {
    expiresIn: config.refreshExpiresIn || "30d",
  } as jwt.SignOptions);
};

export const verifyRefreshToken = (token: string, config: JWTConfig): RefreshTokenPayload | null => {
  try {
    if (!config.refreshSecret || config.refreshSecret.trim() === "" || config.refreshSecret === "change-me-refresh-token-secret") {
      throw new Error("Refresh token secret is not configured. Please set JWT_REFRESH_SECRET environment variable.");
    }
    const decoded = jwt.verify(token, config.refreshSecret) as RefreshTokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};
