import axios from "axios";
import crypto from "crypto";
import { applicationConfig } from "../../config";

const { paystack } = applicationConfig;

interface BankVerificationResult {
  verified: boolean;
  accountName: string;
  accountNumber: string;
}

interface Bank {
  name: string;
  code: string;
  slug: string;
}

interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

interface VerifyTransactionResult {
  status: string; // "success" | "failed" | "abandoned"
  reference: string;
  amount: number;
  currency: string;
  channel: string;
  paidAt: string;
  customerCode: string;
  authorization: {
    authorizationCode: string;
    bin: string;
    last4: string;
    expMonth: string;
    expYear: string;
    channel: string;
    cardType: string;
    bank: string;
    reusable: boolean;
  } | null;
  metadata: Record<string, any>;
}

interface TransferRecipientResult {
  recipientCode: string;
  name: string;
  active: boolean;
  details: {
    accountNumber: string | null;
    bankCode: string | null;
    bankName: string | null;
  };
}

interface InitiateTransferResult {
  status: string;
  reference: string;
  transferCode: string;
  amount: number;
  currency: string;
  reason: string | null;
}

interface PaystackCustomer {
  customerCode: string;
  email: string;
  id: number;
}

interface PaystackPlan {
  planCode: string;
  name: string;
  amount: number;
  interval: string;
}

interface PaystackSubscription {
  subscriptionCode: string;
  emailToken: string;
  status: string;
}

export class PaystackService {
  private static readonly BASE_URL = "https://api.paystack.co";

  /**
   * Verify bank account details using Paystack API
   */
  static async verifyBankAccount(
    accountNumber: string,
    bankCode: string
  ): Promise<BankVerificationResult> {
    try {
      if (!paystack.secretKey) {
        throw new Error("Paystack secret key not configured");
      }

      const response = await axios.get(`${this.BASE_URL}/bank/resolve`, {
        params: {
          account_number: accountNumber,
          bank_code: bankCode,
        },
        headers: {
          Authorization: `Bearer ${paystack.secretKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.status && response.data.data) {
        return {
          verified: true,
          accountName: response.data.data.account_name,
          accountNumber: response.data.data.account_number,
        };
      }

      throw new Error("Bank verification failed");
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.message || "Bank verification failed";
        throw new Error(errorMessage);
      }
      throw new Error(error.message || "Bank verification failed");
    }
  }

  /**
   * Get list of supported Nigerian banks
   */
  static async getBankList(): Promise<Bank[]> {
    try {
      if (!paystack.secretKey) {
        throw new Error("Paystack secret key not configured");
      }

      const response = await axios.get(`${this.BASE_URL}/bank`, {
        params: {
          country: "nigeria",
        },
        headers: {
          Authorization: `Bearer ${paystack.secretKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.status && response.data.data) {
        return response.data.data.map((bank: any) => ({
          name: bank.name,
          code: bank.code,
          slug: bank.slug,
        }));
      }

      return [];
    } catch (error: any) {
      return [];
    }
  }

  /**
   * Compare two names with fuzzy matching
   * Returns true if names are similar (>= 80% match)
   */
  static compareNames(providedName: string, actualName: string): boolean {
    // Normalize names: remove extra spaces, convert to uppercase
    const normalize = (name: string) =>
      name
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ")
        .replace(/[^A-Z\s]/g, "");

    const provided = normalize(providedName);
    const actual = normalize(actualName);

    // Exact match
    if (provided === actual) return true;

    // Check if provided name is contained in actual name
    if (actual.includes(provided)) return true;

    // Calculate similarity score using Levenshtein distance
    const similarity = this.calculateSimilarity(provided, actual);
    return similarity >= 0.8; 
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // ─────────────────────────────────────────────
  // PAYMENT & SUBSCRIPTION METHODS
  // ─────────────────────────────────────────────

  private static getHeaders() {
    if (!paystack.secretKey) {
      throw new Error("Paystack secret key is not configured. Please add PAYSTACK_SECRET_KEY to your environment variables.");
    }
    return {
      Authorization: `Bearer ${paystack.secretKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Create a customer on Paystack
   */
  static async createCustomer(
    email: string,
    firstName: string,
    lastName: string
  ): Promise<PaystackCustomer> {
    try {
      const response = await axios.post(
        `${this.BASE_URL}/customer`,
        { email, first_name: firstName, last_name: lastName },
        { headers: this.getHeaders() }
      );

      if (response.data.status && response.data.data) {
        return {
          customerCode: response.data.data.customer_code,
          email: response.data.data.email,
          id: response.data.data.id,
        };
      }
      throw new Error("Failed to create Paystack customer");
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Failed to create Paystack customer";
      throw new Error(msg);
    }
  }

  /**
   * Initialize a transaction — returns a Paystack checkout URL
   * Channels: ['card', 'bank_transfer', 'bank']
   */
  static async initializeTransaction(
    email: string,
    amount: number,
    reference: string,
    metadata: Record<string, any> = {},
    channels?: string[],
    callbackUrl?: string
  ): Promise<InitializeTransactionResult> {
    try {
      const payload: any = {
        email,
        amount, // in kobo
        reference,
        metadata,
      };
      if (callbackUrl) {
        payload.callback_url = callbackUrl;
      }
      if (channels && channels.length > 0) {
        payload.channels = channels;
      }

      const response = await axios.post(
        `${this.BASE_URL}/transaction/initialize`,
        payload,
        { headers: this.getHeaders() }
      );

      if (response.data.status && response.data.data) {
        return {
          authorizationUrl: response.data.data.authorization_url,
          accessCode: response.data.data.access_code,
          reference: response.data.data.reference,
        };
      }
      throw new Error("Failed to initialize transaction");
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Failed to initialize payment";
      throw new Error(msg);
    }
  }

  /**
   * Verify a transaction by reference
   */
  static async verifyTransaction(
    reference: string
  ): Promise<VerifyTransactionResult> {
    try {
      const response = await axios.get(
        `${this.BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: this.getHeaders() }
      );

      if (response.data.status && response.data.data) {
        const d = response.data.data;
        return {
          status: d.status,
          reference: d.reference,
          amount: d.amount,
          currency: d.currency,
          channel: d.channel,
          paidAt: d.paid_at,
          customerCode: d.customer?.customer_code || "",
          authorization: d.authorization
            ? {
                authorizationCode: d.authorization.authorization_code,
                bin: d.authorization.bin,
                last4: d.authorization.last4,
                expMonth: d.authorization.exp_month,
                expYear: d.authorization.exp_year,
                channel: d.authorization.channel,
                cardType: d.authorization.card_type,
                bank: d.authorization.bank,
                reusable: d.authorization.reusable,
              }
            : null,
          metadata: d.metadata || {},
        };
      }
      throw new Error("Transaction verification failed");
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Transaction verification failed";
      throw new Error(msg);
    }
  }

  /**
   * Create or retrieve a transfer recipient for payouts
   */
  static async createTransferRecipient(params: {
    name: string;
    accountNumber: string;
    bankCode: string;
    description?: string;
  }): Promise<TransferRecipientResult> {
    try {
      const response = await axios.post(
        `${this.BASE_URL}/transferrecipient`,
        {
          type: "nuban",
          name: params.name,
          account_number: params.accountNumber,
          bank_code: params.bankCode,
          currency: "NGN",
          description: params.description,
        },
        { headers: this.getHeaders() }
      );

      if (response.data.status && response.data.data) {
        const recipient = response.data.data;
        return {
          recipientCode: recipient.recipient_code,
          name: recipient.name,
          active: Boolean(recipient.active),
          details: {
            accountNumber: recipient.details?.account_number || null,
            bankCode: recipient.details?.bank_code || null,
            bankName: recipient.details?.bank_name || null,
          },
        };
      }

      throw new Error("Failed to create transfer recipient");
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to create transfer recipient";
      throw new Error(msg);
    }
  }

  /**
   * Initiate a transfer from your Paystack balance to a recipient
   */
  static async initiateTransfer(params: {
    recipientCode: string;
    amount: number;
    reference: string;
    reason?: string;
  }): Promise<InitiateTransferResult> {
    try {
      const response = await axios.post(
        `${this.BASE_URL}/transfer`,
        {
          source: "balance",
          amount: params.amount,
          recipient: params.recipientCode,
          reference: params.reference,
          reason: params.reason,
          currency: "NGN",
        },
        { headers: this.getHeaders() }
      );

      if (response.data.status && response.data.data) {
        const transfer = response.data.data;
        return {
          status: transfer.status,
          reference: transfer.reference,
          transferCode: transfer.transfer_code,
          amount: transfer.amount,
          currency: transfer.currency,
          reason: transfer.reason || null,
        };
      }

      throw new Error("Failed to initiate transfer");
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to initiate transfer";
      throw new Error(msg);
    }
  }

  /**
   * Create a plan on Paystack (for recurring billing)
   */
  static async createPlan(
    name: string,
    amount: number,
    interval: "monthly" | "weekly" | "daily" = "monthly"
  ): Promise<PaystackPlan> {
    try {
      const response = await axios.post(
        `${this.BASE_URL}/plan`,
        { name, amount, interval },
        { headers: this.getHeaders() }
      );

      if (response.data.status && response.data.data) {
        return {
          planCode: response.data.data.plan_code,
          name: response.data.data.name,
          amount: response.data.data.amount,
          interval: response.data.data.interval,
        };
      }
      throw new Error("Failed to create Paystack plan");
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Failed to create Paystack plan";
      throw new Error(msg);
    }
  }

  /**
   * Create a subscription on Paystack (auto-recurring)
   */
  static async createSubscription(
    customerCode: string,
    planCode: string,
    authorization?: string
  ): Promise<PaystackSubscription> {
    try {
      const payload: any = { customer: customerCode, plan: planCode };
      if (authorization) {
        payload.authorization = authorization;
      }

      const response = await axios.post(
        `${this.BASE_URL}/subscription`,
        payload,
        { headers: this.getHeaders() }
      );

      if (response.data.status && response.data.data) {
        return {
          subscriptionCode: response.data.data.subscription_code,
          emailToken: response.data.data.email_token,
          status: response.data.data.status,
        };
      }
      throw new Error("Failed to create Paystack subscription");
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Failed to create subscription";
      throw new Error(msg);
    }
  }

  /**
   * Disable (cancel) a Paystack subscription
   */
  static async disableSubscription(
    subscriptionCode: string,
    emailToken: string
  ): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.BASE_URL}/subscription/disable`,
        { code: subscriptionCode, token: emailToken },
        { headers: this.getHeaders() }
      );
      return response.data.status === true;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Failed to disable subscription";
      throw new Error(msg);
    }
  }

  /**
   * Enable a Paystack subscription
   */
  static async enableSubscription(
    subscriptionCode: string,
    emailToken: string
  ): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.BASE_URL}/subscription/enable`,
        { code: subscriptionCode, token: emailToken },
        { headers: this.getHeaders() }
      );
      return response.data.status === true;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Failed to enable subscription";
      throw new Error(msg);
    }
  }

  /**
   * Verify Paystack webhook signature (HMAC SHA-512)
   */
  static verifyWebhookSignature(
    requestBody: string | Buffer,
    signature: string
  ): boolean {
    if (!paystack.secretKey) {
      throw new Error("Paystack secret key is not configured");
    }
    const hash = crypto
      .createHmac("sha512", paystack.secretKey)
      .update(requestBody)
      .digest("hex");
    return hash === signature;
  }
}
