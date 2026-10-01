import { NextFunction, Request, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";

export type DrugstoreProxyErrorDetails = {
	statusCode: number;
	message: string;
	retryAfter?: string;
};

const readUpstreamMessage = (error: any): string | undefined => {
	const message = error?.response?.data?.message;
	return typeof message === "string" && message.trim() ? message.trim() : undefined;
};

const readRetryAfter = (error: any): string | undefined => {
	const headers = error?.response?.headers;
	const value = headers?.["retry-after"] ?? headers?.get?.("retry-after");
	if (typeof value !== "string" && typeof value !== "number") return undefined;

	const retryAfter = String(value).trim();
	return retryAfter && !/[\r\n]/.test(retryAfter) ? retryAfter : undefined;
};

/** Normalize errors from the Merchant service before exposing them to app clients. */
export const normalizeDrugstoreProxyError = (error: any): DrugstoreProxyErrorDetails => {
	const upstreamStatus = Number(error?.response?.status);
	const hasValidUpstreamStatus = Number.isInteger(upstreamStatus) && upstreamStatus >= 400 && upstreamStatus <= 599;
	const upstreamMessage = readUpstreamMessage(error);

	if (hasValidUpstreamStatus) {
		if (upstreamStatus === 429) {
			return {
				statusCode: 429,
				message: upstreamMessage || "Merchant service is rate limiting requests. Please retry shortly.",
				retryAfter: readRetryAfter(error),
			};
		}

		// These indicate a Merchant-to-Merchant authentication/configuration problem,
		// not that the mobile client itself should authenticate again.
		if (upstreamStatus === 401 || upstreamStatus === 403 || upstreamStatus >= 500) {
			return { statusCode: 502, message: "Merchant service returned an error." };
		}

		return {
			statusCode: upstreamStatus,
			message: upstreamMessage || "Merchant service rejected the request.",
		};
	}

	const code = String(error?.code || "").toUpperCase();
	const message = String(error?.message || "").toLowerCase();
	if (["ECONNABORTED", "ETIMEDOUT"].includes(code) || message.includes("timeout")) {
		return { statusCode: 504, message: "Merchant service request timed out." };
	}

	if (["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ERR_NETWORK"].includes(code)) {
		return { statusCode: 503, message: "Merchant service is unavailable." };
	}

	return { statusCode: 502, message: "Merchant service request failed." };
};

export const handleDrugstoreProxyError = (
	req: Request,
	res: Response,
	next: NextFunction,
	error: unknown,
	fallbackCode: string
) => {
	const { statusCode, message, retryAfter } = normalizeDrugstoreProxyError(error);
	if (statusCode === 429 && retryAfter) res.setHeader("Retry-After", retryAfter);

	return next(
		req.context.manageApplicationErrors({
			message,
			statusCode,
			errorCode: req.context.errorCode(ERR_USER, fallbackCode),
		})
	);
};
