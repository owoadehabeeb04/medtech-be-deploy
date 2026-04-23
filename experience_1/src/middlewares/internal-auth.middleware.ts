import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import CustomError from "../utils/error";
import { applicationConfig } from "../config";

const SHA_256 = "sha256";
const usedNonces = new Map<string, number>();

const cleanupNonces = (windowSeconds: number) => {
	const now = Date.now();
	const minTs = now - windowSeconds * 1000;
	for (const [nonce, timestamp] of usedNonces.entries()) {
		if (timestamp < minTs) usedNonces.delete(nonce);
	}
};

const bodyHash = (body: unknown, method: string): string => {
	if (method === "GET" || method === "DELETE") {
		return crypto.createHash(SHA_256).update("").digest("hex");
	}

	if (body === undefined || body === null) {
		return crypto.createHash(SHA_256).update("").digest("hex");
	}

	if (typeof body === "object" && !Array.isArray(body) && Object.keys(body as object).length === 0) {
		return crypto.createHash(SHA_256).update("").digest("hex");
	}

	return crypto.createHash(SHA_256).update(JSON.stringify(body)).digest("hex");
};

const safeEqual = (left: string, right: string) => {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);
	if (leftBuffer.length !== rightBuffer.length) return false;
	return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const internalAuthMiddleware = (req: Request, _: Response, next: NextFunction) => {
	try {
		const keyId = String(req.header("x-internal-key-id") || "");
		const timestamp = String(req.header("x-internal-timestamp") || "");
		const nonce = String(req.header("x-internal-nonce") || "");
		const signature = String(req.header("x-internal-signature") || "");

		if (!keyId || !timestamp || !nonce || !signature) {
			throw CustomError.manageApplicationErrors({
				message: "Missing internal authentication headers",
				statusCode: 401,
			});
		}

		const expectedKeyId = applicationConfig.merchantIntegration?.keyId || "";
		const secret = applicationConfig.merchantIntegration?.secret || "";

		if (!expectedKeyId || !secret) {
			throw CustomError.manageApplicationErrors({
				message: "Internal integration credentials are not configured",
				statusCode: 500,
			});
		}

		if (keyId !== expectedKeyId) {
			throw CustomError.manageApplicationErrors({
				message: "Invalid internal key id",
				statusCode: 401,
			});
		}

		const timestampNumber = Number(timestamp);
		if (!Number.isFinite(timestampNumber)) {
			throw CustomError.manageApplicationErrors({
				message: "Invalid timestamp",
				statusCode: 401,
			});
		}

		const allowedSkew = applicationConfig.merchantIntegration?.syncWorker?.pollIntervalMs
			? Math.max(300, Math.ceil(applicationConfig.merchantIntegration.syncWorker.pollIntervalMs / 1000))
			: 300;
		const now = Math.floor(Date.now() / 1000);
		if (Math.abs(now - timestampNumber) > allowedSkew) {
			throw CustomError.manageApplicationErrors({
				message: "Timestamp outside accepted window",
				statusCode: 401,
			});
		}

		cleanupNonces(allowedSkew);
		if (usedNonces.has(nonce)) {
			throw CustomError.manageApplicationErrors({
				message: "Replay request detected",
				statusCode: 401,
			});
		}

		const path = req.originalUrl;
		const hash = bodyHash(req.body, req.method.toUpperCase());
		const canonical = `${req.method.toUpperCase()}\n${path}\n${timestamp}\n${nonce}\n${hash}`;
		const expectedSignature = crypto.createHmac(SHA_256, secret).update(canonical).digest("hex");

		if (!safeEqual(signature, expectedSignature)) {
			throw CustomError.manageApplicationErrors({
				message: "Invalid internal signature",
				statusCode: 401,
			});
		}

		usedNonces.set(nonce, Date.now());
		return next();
	} catch (error) {
		return next(error);
	}
};
