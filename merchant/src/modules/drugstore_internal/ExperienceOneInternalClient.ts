import axios, { AxiosInstance } from "axios";
import crypto from "crypto";
import { applicationConfig } from "../../config";

const SHA_256 = "sha256";

type QueryValue = string | number | boolean | undefined;

export class ExperienceOneInternalClient {
  private static client: AxiosInstance | null = null;

  private static getClient(): AxiosInstance {
    if (!this.client) {
      const baseUrl = applicationConfig.experience1Integration?.baseUrl || "";
      this.client = axios.create({
        baseURL: baseUrl,
        timeout: 10000,
      });
    }
    return this.client;
  }

  private static bodyHash(body?: unknown): string {
    if (body === undefined || body === null) return crypto.createHash(SHA_256).update("").digest("hex");
    return crypto.createHash(SHA_256).update(JSON.stringify(body)).digest("hex");
  }

  private static sign(method: string, path: string, timestamp: string, nonce: string, bodyHash: string): string {
    const secret = applicationConfig.internalIntegration?.secret || "";
    const canonical = `${method.toUpperCase()}\n${path}\n${timestamp}\n${nonce}\n${bodyHash}`;
    return crypto.createHmac(SHA_256, secret).update(canonical).digest("hex");
  }

  private static headers(method: string, path: string, body?: unknown) {
    const keyId = applicationConfig.internalIntegration?.keyId || "";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomUUID();
    const hash = this.bodyHash(body);
    const signature = this.sign(method, path, timestamp, nonce, hash);

    return {
      "X-Internal-Client": "merchant",
      "X-Internal-Key-Id": keyId,
      "X-Internal-Timestamp": timestamp,
      "X-Internal-Nonce": nonce,
      "X-Internal-Signature": signature,
    };
  }

  private static normalizePath(path: string, query?: Record<string, QueryValue>): string {
    const url = new URL(path, "http://placeholder.local");
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === "") continue;
        url.searchParams.set(key, String(value));
      }
    }
    return `${url.pathname}${url.search}`;
  }

  private static unwrap<T>(response: any): T {
    if (response?.data?.data !== undefined) return response.data.data as T;
    return response.data as T;
  }

  static async get<T>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    const normalizedPath = this.normalizePath(path, query);
    const res = await this.getClient().request({
      method: "GET",
      url: normalizedPath,
      headers: this.headers("GET", normalizedPath),
    });
    return this.unwrap<T>(res);
  }

  static async post<T>(path: string, body?: unknown): Promise<T> {
    const normalizedPath = this.normalizePath(path);
    const res = await this.getClient().request({
      method: "POST",
      url: normalizedPath,
      data: body,
      headers: {
        ...this.headers("POST", normalizedPath, body),
        "Content-Type": "application/json",
      },
    });
    return this.unwrap<T>(res);
  }
}
