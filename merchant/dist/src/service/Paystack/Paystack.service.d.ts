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
export declare class PaystackService {
    private static readonly BASE_URL;
    /**
     * Verify bank account details using Paystack API
     */
    static verifyBankAccount(accountNumber: string, bankCode: string): Promise<BankVerificationResult>;
    /**
     * Get list of supported Nigerian banks
     */
    static getBankList(): Promise<Bank[]>;
    /**
     * Compare two names with fuzzy matching
     * Returns true if names are similar (>= 80% match)
     */
    static compareNames(providedName: string, actualName: string): boolean;
    /**
     * Calculate string similarity using Levenshtein distance
     */
    private static calculateSimilarity;
    /**
     * Calculate Levenshtein distance between two strings
     */
    private static levenshteinDistance;
}
export {};
//# sourceMappingURL=Paystack.service.d.ts.map