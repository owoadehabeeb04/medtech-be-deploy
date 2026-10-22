import { PagaBusinessClient, PagaConfig } from "@medtech/utils";
import { applicationConfig } from "../../config";

const { paga } = applicationConfig;

/** Thrown when Paga is not set up on this server (missing keys). Callers turn it into a clear 503. */
export class PagaNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super("Paga is not configured on this server (missing: " + missing.join(", ") + ")");
    this.name = "PagaNotConfiguredError";
  }
}

const baseConfig = (): PagaConfig => ({
  env: paga.env,
  publicKey: paga.publicKey,
  secretKey: paga.secretKey,
  hashKey: paga.hashKey,
  businessPrincipal: paga.businessPrincipal,
  businessCredentials: paga.businessCredentials,
  timeoutMs: paga.timeoutMs,
  urls: {
    ...(paga.businessUrl ? { business: paga.businessUrl } : {}),
    ...(paga.checkoutUrl ? { checkout: paga.checkoutUrl } : {}),
    ...(paga.checkoutVerifyUrl ? { checkoutVerify: paga.checkoutVerifyUrl } : {}),
  },
});

let businessClient: PagaBusinessClient | null = null;

/** The Business API client (bank list, account-name check, payouts, balance). Built once, on first use. */
export const getPagaBusinessClient = (): PagaBusinessClient => {
  if (businessClient) return businessClient;

  const missing: string[] = [];
  if (!paga.businessPrincipal) missing.push("PAGA_BUSINESS_PRINCIPAL");
  if (!paga.businessCredentials) missing.push("PAGA_BUSINESS_CREDENTIALS");
  if (!paga.hashKey) missing.push("PAGA_HASH_KEY");
  if (missing.length > 0) throw new PagaNotConfiguredError(missing);

  businessClient = new PagaBusinessClient(baseConfig());
  return businessClient;
};

/** Config for Checkout links, payment verification and callback checks (needs the public, secret and hash keys). */
export const getPagaCheckoutConfig = (): PagaConfig => {
  const missing: string[] = [];
  if (!paga.publicKey) missing.push("PAGA_PUBLIC_KEY");
  if (!paga.secretKey) missing.push("PAGA_SECRET_KEY");
  if (!paga.hashKey) missing.push("PAGA_HASH_KEY");
  if (missing.length > 0) throw new PagaNotConfiguredError(missing);
  return baseConfig();
};

export const isPagaCheckoutConfigured = (): boolean => !!(paga.publicKey && paga.secretKey && paga.hashKey);
