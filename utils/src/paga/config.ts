export type PagaEnv = "test" | "live";

export interface PagaRequest {
  method: "GET" | "POST";
  url: string;
  headers: { [name: string]: string };
  body?: unknown;
  timeoutMs: number;
}

export interface PagaResponse {
  status: number;
  body: any;
}

/** Swappable HTTP layer: the default uses fetch; tests inject a stub. */
export type PagaTransport = (request: PagaRequest) => Promise<PagaResponse>;

export interface PagaUrls {
  business: string;
  collect: string;
  checkout: string;
  checkoutVerify: string;
}

export interface PagaConfig {
  env: PagaEnv;
  /** Business Portal > Developer Tools > API Keys */
  publicKey: string;
  secretKey: string;
  /** the "HMAC" / hash key from the same page */
  hashKey: string;
  /** Business API only */
  businessPrincipal?: string;
  businessCredentials?: string;
  timeoutMs?: number;
  transport?: PagaTransport;
  urls?: Partial<PagaUrls>;
}

// Documented base URLs (developer-docs.paga.com).
const URLS: { [env: string]: PagaUrls } = {
  test: {
    business: "https://beta.mypaga.com",
    collect: "https://beta-collect.paga.com",
    checkout: "https://beta-checkout.paga.com",
    // UNCONFIRMED: the docs give only the live verify URL; this assumes the same path on the beta host.
    checkoutVerify: "https://beta-checkout.paga.com/checkout/transaction/verify",
  },
  live: {
    business: "https://www.mypaga.com",
    collect: "https://collect.paga.com",
    checkout: "https://checkout.paga.com",
    checkoutVerify: "https://checkout.paga.com/checkout/transaction/verify",
  },
};

export const resolveUrls = (config: PagaConfig): PagaUrls => {
  const base = URLS[config.env];
  if (!base) throw new Error("PAGA_ENV must be 'test' or 'live'");
  return { ...base, ...(config.urls || {}) };
};

export const DEFAULT_TIMEOUT_MS = 20000;
