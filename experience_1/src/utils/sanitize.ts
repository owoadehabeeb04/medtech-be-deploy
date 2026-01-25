import { capitalize } from ".";

/**
 * Sanitizes a string by removing potentially dangerous or corrupt characters.
 *
 * @param input - The string to sanitize
 * @param options - Optional configuration for sanitization
 * @returns The sanitized string
 */
export function sanitizeInput(
	input: string | null | undefined,
	options: {
		allowHtml?: boolean; // Whether to allow HTML tags
		allowScriptTags?: boolean; // Whether to allow script tags (only works if allowHtml is true)
		allowSpecialChars?: boolean; // Whether to allow special characters like <>&'"
		maxLength?: number; // Maximum allowed string length
		trim?: boolean; // Whether to trim whitespace
		lowerCase?: boolean;
		upperCase?: boolean;
		capitalize?: boolean;
	} = {}
): string {
	// Handle null or undefined input
	if (input === null || input === undefined) {
		return "";
	}

	// Convert to string in case input is not a string
	let sanitized = String(input);

	// Apply max length if specified
	if (options.maxLength && sanitized.length > options.maxLength) {
		sanitized = sanitized.substring(0, options.maxLength);
	}

	// Trim whitespace if requested
	if (options.trim !== false) {
		sanitized = sanitized.trim();
	}

	// Lowercase if requested
	if (options.lowerCase !== false) {
		sanitized = sanitized.toLowerCase();
	}
	// Uppercase if requested
	if (options.upperCase !== false) {
		sanitized = sanitized.toUpperCase();
	}
	// Lowercase if requested
	if (options.capitalize !== false) {
		sanitized = capitalize(sanitized);
	}

	// If HTML is not allowed, remove all HTML tags
	if (!options.allowHtml) {
		sanitized = sanitized.replace(/<[^>]*>/g, "");
	} else if (!options.allowScriptTags) {
		// If HTML is allowed but script tags aren't, remove script tags
		sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
		sanitized = sanitized.replace(/on\w+="[^"]*"/g, ""); // Remove event handlers
		sanitized = sanitized.replace(/javascript:/gi, ""); // Remove javascript: protocol
	}

	// If special characters are not allowed, encode them
	if (!options.allowSpecialChars) {
		sanitized = sanitized.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/\//g, "&#x2F;");
	}

	// Remove control characters and non-printable characters
	sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

	// Remove potential SQL injection characters if they appear in suspicious patterns
	sanitized = sanitized.replace(/(\b)(on\S+)(\s*)=/gi, "$1data-blocked-$2$3=");
	sanitized = sanitized.replace(/((java|vb|j|%)script:)/gi, "blocked-$1");
	sanitized = sanitized.replace(/(<\s*)(\/*)script/gi, "$1$2blocked-script");

	// Remove potential command injection characters when they appear suspicious
	sanitized = sanitized.replace(/(\||;|&|`|\$\(|\${)/g, "");

	return sanitized;
}
