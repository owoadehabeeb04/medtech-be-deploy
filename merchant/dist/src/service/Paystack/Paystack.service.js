"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackService = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../../config");
const { paystack } = config_1.applicationConfig;
class PaystackService {
    /**
     * Verify bank account details using Paystack API
     */
    static verifyBankAccount(accountNumber, bankCode) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                if (!paystack.secretKey) {
                    throw new Error("Paystack secret key not configured");
                }
                const response = yield axios_1.default.get(`${this.BASE_URL}/bank/resolve`, {
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
            }
            catch (error) {
                if (error.response) {
                    const errorMessage = ((_a = error.response.data) === null || _a === void 0 ? void 0 : _a.message) || "Bank verification failed";
                    throw new Error(errorMessage);
                }
                throw new Error(error.message || "Bank verification failed");
            }
        });
    }
    /**
     * Get list of supported Nigerian banks
     */
    static getBankList() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!paystack.secretKey) {
                    throw new Error("Paystack secret key not configured");
                }
                const response = yield axios_1.default.get(`${this.BASE_URL}/bank`, {
                    params: {
                        country: "nigeria",
                    },
                    headers: {
                        Authorization: `Bearer ${paystack.secretKey}`,
                        "Content-Type": "application/json",
                    },
                });
                if (response.data.status && response.data.data) {
                    return response.data.data.map((bank) => ({
                        name: bank.name,
                        code: bank.code,
                        slug: bank.slug,
                    }));
                }
                return [];
            }
            catch (error) {
                return [];
            }
        });
    }
    /**
     * Compare two names with fuzzy matching
     * Returns true if names are similar (>= 80% match)
     */
    static compareNames(providedName, actualName) {
        // Normalize names: remove extra spaces, convert to uppercase
        const normalize = (name) => name
            .trim()
            .toUpperCase()
            .replace(/\s+/g, " ")
            .replace(/[^A-Z\s]/g, "");
        const provided = normalize(providedName);
        const actual = normalize(actualName);
        // Exact match
        if (provided === actual)
            return true;
        // Check if provided name is contained in actual name
        if (actual.includes(provided))
            return true;
        // Calculate similarity score using Levenshtein distance
        const similarity = this.calculateSimilarity(provided, actual);
        return similarity >= 0.8; // 80% similarity threshold
    }
    /**
     * Calculate string similarity using Levenshtein distance
     */
    static calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0)
            return 1.0;
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    /**
     * Calculate Levenshtein distance between two strings
     */
    static levenshteinDistance(str1, str2) {
        const matrix = [];
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
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1, // insertion
                    matrix[i - 1][j] + 1 // deletion
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
}
exports.PaystackService = PaystackService;
PaystackService.BASE_URL = "https://api.paystack.co";
