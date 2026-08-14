import rateLimit from "express-rate-limit";
import { applicationConfig } from "../config";

const INTERNAL_API_PREFIX = "/api/v1/merchant/internal/";

const isInternalApiRequest = (request: { originalUrl?: string; path?: string }): boolean => {
	const requestPath = request.originalUrl || request.path || "";
	return requestPath.split("?", 1)[0].startsWith(INTERNAL_API_PREFIX);
};

/**
 * Public traffic keeps the normal per-IP quota. Internal HMAC routes are
 * handled by the separate limiter below so service-to-service traffic cannot
 * consume the public quota.
 */
export const publicRateLimiter = rateLimit({
	windowMs: applicationConfig.rateLimitOptions.duration,
	max: applicationConfig.rateLimitOptions.maxRequestsPerMinute,
	message: {
		status: 429,
		message: "Too many requests from this IP. Try again in a minute.",
	},
	standardHeaders: true,
	legacyHeaders: false,
	skip: (request) => isInternalApiRequest(request),
});

/**
 * Internal requests are authenticated before this middleware runs. Use the
 * validated key id as the bucket so one internal client cannot starve another.
 */
export const internalRateLimiter = rateLimit({
	windowMs: applicationConfig.internalRateLimitOptions.duration,
	max: applicationConfig.internalRateLimitOptions.maxRequestsPerMinute,
	keyGenerator: (request) => request.header("x-internal-key-id") || "internal-unknown",
	message: {
		status: 429,
		message: "Too many internal requests. Try again shortly.",
	},
	standardHeaders: true,
	legacyHeaders: false,
});
