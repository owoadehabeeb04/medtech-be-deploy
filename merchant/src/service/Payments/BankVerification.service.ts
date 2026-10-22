import * as crypto from "crypto";
import { PagaError } from "@medtech/utils";
import { applicationConfig } from "../../config";
import { PaystackService } from "../Paystack/Paystack.service";
import { compareNames } from "./nameMatch";
import { getPagaBusinessClient, PagaNotConfiguredError } from "./PagaClients";

const { bankVerification, paga } = applicationConfig;

export interface Bank {
  name: string;
  /** Paga: the bank's UUID. Paystack: its bank code. Opaque to the apps: they send back what they were given. */
  code: string;
  slug: string;
}

export interface VerifiedAccount {
  accountName: string;
  bankName: string;
  bankCode: string;
  provider: "paga" | "paystack";
}

export type BankVerificationReason =
  | "unavailable"
  | "not_configured"
  | "invalid_account"
  | "unknown_bank"
  | "name_mismatch"
  | "rate_limited"
  | "failed";

/** Every failure of a bank check. `statusCode` is what the API should answer with. */
export class BankVerificationError extends Error {
  constructor(
    message: string,
    readonly reason: BankVerificationReason,
    readonly statusCode: number,
    readonly actualName?: string
  ) {
    super(message);
    this.name = "BankVerificationError";
  }
}

interface BankProvider {
  readonly name: "paga" | "paystack";
  listBanks(): Promise<Bank[]>;
  resolveAccount(bankCode: string, accountNumber: string): Promise<{ accountName: string; bankName: string }>;
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const maskAccount = (accountNumber: string) => (accountNumber.length > 4 ? "******" + accountNumber.slice(-4) : "****");

// ---------------------------------------------------------------------------------------------
// Paga
// ---------------------------------------------------------------------------------------------
class PagaBankProvider implements BankProvider {
  readonly name = "paga" as const;

  private cache: { banks: Bank[]; fetchedAt: number } | null = null;
  private inFlight: Promise<Bank[]> | null = null;

  /** Bank list, cached. If Paga is down we keep serving the last good list rather than an empty one. */
  async listBanks(): Promise<Bank[]> {
    const fresh = this.cache && Date.now() - this.cache.fetchedAt < paga.bankListCacheMs;
    if (fresh) return this.cache!.banks;

    // One refresh at a time, however many requests arrive together
    if (!this.inFlight) {
      this.inFlight = this.fetchBanks().finally(() => {
        this.inFlight = null;
      });
    }

    try {
      return await this.inFlight;
    } catch (error) {
      if (this.cache) {
        console.warn("[Bank] Paga bank list refresh failed; serving the cached list");
        return this.cache.banks;
      }
      throw this.translate(error);
    }
  }

  private async fetchBanks(): Promise<Bank[]> {
    const client = getPagaBusinessClient();
    const result = await client.getBanks("BL-" + crypto.randomUUID().replace(/-/g, ""));
    if (result.responseCode !== 0) {
      throw new PagaError("Paga could not return the bank list (code " + result.responseCode + ")", { kind: "api", code: result.responseCode });
    }

    const banks = result.banks
      .filter((bank) => bank.uuid && bank.name)
      .map((bank) => ({ name: bank.name, code: bank.uuid, slug: slugify(bank.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (banks.length === 0) throw new PagaError("Paga returned an empty bank list", { kind: "invalid_response" });

    this.cache = { banks, fetchedAt: Date.now() };
    return banks;
  }

  async resolveAccount(bankCode: string, accountNumber: string) {
    // Check the bank against the list first: no point spending a (possibly billed) lookup on a bad id
    const banks = await this.listBanks();
    const bank = banks.find((entry) => entry.code === bankCode);
    if (!bank) {
      throw new BankVerificationError("Unknown bank. Please choose a bank from the list.", "unknown_bank", 400);
    }

    try {
      const client = getPagaBusinessClient();
      const result = await client.validateDepositToBank({
        // Unique per lookup: Paga rejects a repeated reference (code 105)
        referenceNumber: "BV-" + crypto.randomUUID().replace(/-/g, ""),
        amountKobo: paga.nameLookupAmountKobo,
        destinationBankUUID: bankCode,
        destinationBankAccountNumber: accountNumber,
      });

      if (result.outcome === "success" && result.accountHolderName) {
        return { accountName: result.accountHolderName, bankName: bank.name };
      }
      if (result.outcome === "success") {
        throw new BankVerificationError("The bank did not return an account name. Please check the details and try again.", "failed", 400);
      }
      if (result.outcome === "invalid_account") {
        throw new BankVerificationError("We couldn't find that account. Check the account number and the bank.", "invalid_account", 400);
      }

      // Anything else is not the merchant's fault (insufficient balance on our side, duplicate, unknown code)
      console.error("[Bank] Paga name lookup returned code", result.responseCode, "for", maskAccount(accountNumber), result.message);
      throw new BankVerificationError("Bank verification failed. Please try again shortly.", "failed", 502);
    } catch (error) {
      if (error instanceof BankVerificationError) throw error;
      throw this.translate(error);
    }
  }

  /** Turn a transport/config failure into a client-facing error. Name lookups are read-only, so retrying is always safe. */
  private translate(error: unknown): BankVerificationError {
    if (error instanceof PagaNotConfiguredError) {
      console.error("[Bank]", error.message);
      return new BankVerificationError("Bank verification is not available right now. Please try again later.", "not_configured", 503);
    }
    if (error instanceof PagaError) {
      console.error("[Bank] Paga request failed:", error.kind, error.message);
      return new BankVerificationError("Bank verification is temporarily unavailable. Please try again shortly.", "unavailable", 503);
    }
    console.error("[Bank] Unexpected error:", (error as Error)?.message);
    return new BankVerificationError("Bank verification failed. Please try again shortly.", "failed", 502);
  }
}

// ---------------------------------------------------------------------------------------------
// Paystack (emergency fallback only: PAYMENT_PROVIDER_BANK_VERIFICATION=paystack)
// ---------------------------------------------------------------------------------------------
class PaystackBankProvider implements BankProvider {
  readonly name = "paystack" as const;

  async listBanks(): Promise<Bank[]> {
    return PaystackService.getBankList();
  }

  async resolveAccount(bankCode: string, accountNumber: string) {
    try {
      const result = await PaystackService.verifyBankAccount(accountNumber, bankCode);
      if (!result.verified) {
        throw new BankVerificationError("Unable to verify bank account", "invalid_account", 400);
      }
      const bank = (await this.listBanks()).find((entry) => entry.code === bankCode);
      return { accountName: result.accountName, bankName: bank?.name || bankCode };
    } catch (error: any) {
      if (error instanceof BankVerificationError) throw error;
      throw new BankVerificationError(error?.message || "Bank verification failed", "failed", 400);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The service the rest of the app uses
// ---------------------------------------------------------------------------------------------
const providers = { paga: new PagaBankProvider(), paystack: new PaystackBankProvider() };

const activeProvider = (): BankProvider => (bankVerification.provider === "paystack" ? providers.paystack : providers.paga);

// Attempts per merchant in a sliding window (in memory, per server instance)
const attempts = new Map<string, number[]>();

const checkRateLimit = (merchantId: string) => {
  const now = Date.now();
  const recent = (attempts.get(merchantId) || []).filter((time) => now - time < bankVerification.windowMs);
  if (recent.length >= bankVerification.maxAttemptsPerWindow) {
    const waitMinutes = Math.ceil((bankVerification.windowMs - (now - recent[0])) / 60000);
    throw new BankVerificationError(
      `Too many bank verification attempts. Please try again in ${waitMinutes} minute${waitMinutes === 1 ? "" : "s"}.`,
      "rate_limited",
      429
    );
  }
  recent.push(now);
  attempts.set(merchantId, recent);
};

export class BankVerificationService {
  static get providerName(): "paga" | "paystack" {
    return activeProvider().name;
  }

  /** Banks a merchant can choose from. `code` is whatever the active provider uses to identify the bank. */
  static async listBanks(): Promise<Bank[]> {
    return activeProvider().listBanks();
  }

  /**
   * Confirm a bank account exists and that its holder's name matches what the merchant typed.
   * Throws BankVerificationError for every failure, including a name mismatch (reason `name_mismatch`,
   * carrying the bank's actual name so the app can show it).
   */
  static async verifyAccount(input: {
    merchantId: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
  }): Promise<VerifiedAccount> {
    if (!/^\d{10}$/.test(input.accountNumber)) {
      throw new BankVerificationError("Account number must be 10 digits", "invalid_account", 400);
    }
    if (!input.bankCode) {
      throw new BankVerificationError("Please choose a bank", "unknown_bank", 400);
    }

    checkRateLimit(input.merchantId);

    const provider = activeProvider();
    const resolved = await provider.resolveAccount(input.bankCode, input.accountNumber);

    if (!compareNames(input.accountName, resolved.accountName)) {
      throw new BankVerificationError("Account name verification failed", "name_mismatch", 400, resolved.accountName);
    }

    return { accountName: resolved.accountName, bankName: resolved.bankName, bankCode: input.bankCode, provider: provider.name };
  }

  /** Test helper: forget cached banks and attempt counters. */
  static resetForTests(): void {
    attempts.clear();
    (providers.paga as any).cache = null;
    (providers.paga as any).inFlight = null;
  }
}
