import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { HttpException } from "@medtech/utils";
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
      throw new HttpException(401, "Missing internal authentication headers");
    }

    const expectedKeyId = applicationConfig.internalIntegration?.keyId || "";
    const secret = applicationConfig.internalIntegration?.secret || "";

    if (!expectedKeyId || !secret) {
      throw new HttpException(500, "Internal integration credentials are not configured");
    }

    if (keyId !== expectedKeyId) {
      throw new HttpException(401, "Invalid internal key id");
    }

    const timestampNumber = Number(timestamp);
    if (!Number.isFinite(timestampNumber)) {
      throw new HttpException(401, "Invalid timestamp");
    }

    const allowedSkew = applicationConfig.internalIntegration?.allowedClockSkewSeconds || 300;
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestampNumber) > allowedSkew) {
      throw new HttpException(401, "Timestamp outside accepted window");
    }

    cleanupNonces(allowedSkew);
    if (usedNonces.has(nonce)) {
      throw new HttpException(401, "Replay request detected");
    }

    const path = req.originalUrl;
    const hash = bodyHash(req.body, req.method.toUpperCase());
    const canonical = `${req.method.toUpperCase()}\n${path}\n${timestamp}\n${nonce}\n${hash}`;
    const expectedSignature = crypto.createHmac(SHA_256, secret).update(canonical).digest("hex");

    if (!safeEqual(signature, expectedSignature)) {
      throw new HttpException(401, "Invalid internal signature");
    }

    usedNonces.set(nonce, Date.now());
    return next();
  } catch (error) {
    return next(error);
  }
};
