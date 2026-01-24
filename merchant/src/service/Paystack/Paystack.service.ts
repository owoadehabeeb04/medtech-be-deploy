import axios from "axios";
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
      console.error("Failed to fetch bank list:", error.message);
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
    return similarity >= 0.8; // 80% similarity threshold
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
}
