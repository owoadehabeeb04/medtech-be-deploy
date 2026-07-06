import crypto from "crypto";
import { applicationConfig } from "../../config";

// Dedicated AES-256-GCM implementation, independent of the shared response-encryption
// utility (utils/encrypt.ts), which is configured for AES-256-CBC and doesn't support
// getAuthTag(). Card authorization codes are a distinct concern from response payloads
// and warrant their own key/algorithm rather than reusing that shared config.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

type CipherPayload = {
	encrypted: string;
	iv: string;
	tag: string;
};

const getKey = (): Buffer => {
	const key = applicationConfig.cardEncryption?.key || "";
	if (!key) {
		throw new Error("Card encryption key is not configured.");
	}
	const keyBuffer = Buffer.from(key, "hex");
	if (keyBuffer.length !== 32) {
		throw new Error("Card encryption key must be 64 hex characters (32 bytes).");
	}
	return keyBuffer;
};

export const encryptAuthorizationCode = (authorizationCode: string): string => {
	const key = getKey();
	const iv = crypto.randomBytes(IV_LENGTH);
	const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

	let encrypted = cipher.update(authorizationCode, "utf8", "hex");
	encrypted += cipher.final("hex");
	const tag = cipher.getAuthTag();

	const payload: CipherPayload = { encrypted, iv: iv.toString("hex"), tag: tag.toString("hex") };
	return JSON.stringify(payload);
};

export const decryptAuthorizationCode = (cipherText: string): string => {
	const key = getKey();
	const payload: CipherPayload = JSON.parse(cipherText);

	const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, "hex"));
	decipher.setAuthTag(Buffer.from(payload.tag, "hex"));

	let decrypted = decipher.update(payload.encrypted, "hex", "utf8");
	decrypted += decipher.final("utf8");
	return decrypted;
};
