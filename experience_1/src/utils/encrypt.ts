import * as crypto from "crypto";
import { applicationConfig } from "../config";

// AES-256-GCM configuration
const { encryption } = applicationConfig;

const ALGORITHM = encryption.algorithm;
const KEY_LENGTH = encryption.keyLength;
const IV_LENGTH = encryption.ivLength;
const TAG_LENGTH = 16;

export interface EncryptedData {
	encrypted: string;
	iv: string;
	tag: string;
}

/**
 * Generate a random encryption key
 * Store this securely - you'll need it for decryption
 */
export function generateKey(): string {
	return crypto.randomBytes(KEY_LENGTH).toString("hex");
}

/**
 * Encrypt data using AES-256-GCM
 * @param data - The data to encrypt (string)
 * @param key - The encryption key (hex string)
 * @returns Object containing encrypted data, IV, and authentication tag
 */
export function encrypt(data: string, key: string): EncryptedData {
	try {
		// Convert hex key to buffer
		const keyBuffer: any = Buffer.from(key, "hex");

		if (keyBuffer.length !== KEY_LENGTH) {
			throw new Error(`Key must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes)`);
		}

		// Generate random IV
		const iv: any = crypto.randomBytes(IV_LENGTH);

		// Create cipher using createCipheriv (not deprecated)
		const cipher: any = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

		// Encrypt the data
		let encrypted = cipher.update(data, "utf8", "hex");
		encrypted += cipher.final("hex");

		// Get authentication tag
		const tag = cipher.getAuthTag();

		return {
			encrypted: encrypted,
			iv: iv.toString("hex"),
			tag: tag.toString("hex"),
		};
	} catch (error) {
		throw new Error(`Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}

/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData - Object containing encrypted data, IV, and tag
 * @param key - The encryption key (hex string)
 * @returns Decrypted data as string
 */
export function decrypt(encryptedData: EncryptedData, key: string): string {
	try {
		// Convert hex strings to buffers
		const keyBuffer: any = Buffer.from(key, "hex");
		const ivBuffer: any = Buffer.from(encryptedData.iv, "hex");
		const tagBuffer: any = Buffer.from(encryptedData.tag, "hex");

		if (keyBuffer.length !== KEY_LENGTH) {
			throw new Error(`Key must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes)`);
		}

		// Create decipher using createDecipheriv (not deprecated)
		const decipher: any = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
		decipher.setAuthTag(tagBuffer);

		// Decrypt the data
		let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
		decrypted += decipher.final("utf8");

		return decrypted;
	} catch (error) {
		throw new Error(`Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}

/**
 * Convenience function to encrypt data with a password-derived key
 * @param data - The data to encrypt
 * @param password - Password to derive key from
 * @param salt - Optional salt (will generate random if not provided)
 * @returns Object with encrypted data and salt
 */
export function encryptWithPassword(data: string, password: string, salt?: string): EncryptedData & { salt: string } {
	const saltBuffer: any = salt ? Buffer.from(salt, "hex") : crypto.randomBytes(16);

	// Derive key from password using PBKDF2
	const key = crypto.pbkdf2Sync(password, saltBuffer, 10000, KEY_LENGTH, "sha256");

	const encrypted = encrypt(data, key.toString("hex"));

	return {
		...encrypted,
		salt: saltBuffer.toString("hex"),
	};
}

/**
 * Convenience function to decrypt data with a password-derived key
 * @param encryptedData - Object containing encrypted data, IV, tag, and salt
 * @param password - Password to derive key from
 * @returns Decrypted data as string
 */
export function decryptWithPassword(encryptedData: EncryptedData & { salt: string }, password: string): string {
	const saltBuffer: any = Buffer.from(encryptedData.salt, "hex");

	// Derive key from password using PBKDF2
	const key = crypto.pbkdf2Sync(password, saltBuffer, 10000, KEY_LENGTH, "sha256");

	return decrypt(encryptedData, key.toString("hex"));
}
