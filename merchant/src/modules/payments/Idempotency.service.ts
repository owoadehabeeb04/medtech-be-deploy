import * as crypto from "crypto";
import { Op } from "sequelize";
import { HttpException } from "@medtech/utils";
import { IdempotencyKey } from "./IdempotencyKey.model";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
// A request that started but never finished (crash) is taken over after this long.
const IN_PROGRESS_TIMEOUT_MS = 60 * 1000;

/** JSON with sorted keys, so the same body always hashes the same regardless of property order. */
const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value === undefined ? null : value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const object = value as { [key: string]: unknown };
  return (
    "{" +
    Object.keys(object)
      .sort()
      .filter((key) => object[key] !== undefined)
      .map((key) => JSON.stringify(key) + ":" + stableStringify(object[key]))
      .join(",") +
    "}"
  );
};

export const hashRequest = (body: unknown): string => crypto.createHash("sha256").update(stableStringify(body)).digest("hex");

export class IdempotencyService {
  /**
   * Run `handler` at most once per (scope, key):
   *  - same key + same body after success  -> the stored response is replayed, the handler is NOT run again;
   *  - same key + different body            -> 409 (a reused key is a client bug, never guess);
   *  - same key while the first is running  -> 409 "still processing" (never run twice concurrently);
   *  - handler throws                       -> the key is released so the client can retry safely.
   * The handler's return value must be JSON-serialisable (it is stored and replayed).
   */
  static async run<T>(
    scope: string,
    key: string,
    requestBody: unknown,
    handler: () => Promise<T>,
    options: { ttlMs?: number; responseStatus?: number } = {}
  ): Promise<{ replayed: boolean; value: T }> {
    if (!key || key.length > 255) throw new HttpException(400, "Idempotency-Key must be 1-255 characters");

    const requestHash = hashRequest(requestBody);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (options.ttlMs || DEFAULT_TTL_MS));

    // An expired key is as good as new
    await IdempotencyKey.destroy({ where: { scope, key, expiresAt: { [Op.lt]: now } } });

    let record: IdempotencyKey | null = null;
    try {
      record = await IdempotencyKey.create({ scope, key, requestHash, status: "in_progress", expiresAt });
    } catch (error: any) {
      if (error?.name !== "SequelizeUniqueConstraintError") throw error;
    }

    if (!record) {
      const existing = await IdempotencyKey.findOne({ where: { scope, key } });
      if (!existing) return this.run(scope, key, requestBody, handler, options); // released between our two queries

      if (existing.requestHash !== requestHash) {
        throw new HttpException(409, "This Idempotency-Key was already used with a different request");
      }
      if (existing.status === "completed") {
        return { replayed: true, value: existing.responseBody as T };
      }
      const staleBefore = new Date(now.getTime() - IN_PROGRESS_TIMEOUT_MS);
      if (existing.updatedAt.getTime() >= staleBefore.getTime()) {
        throw new HttpException(409, "A request with this Idempotency-Key is still being processed");
      }
      // Stale: the first attempt died. Take it over. The condition is evaluated by the database in one
      // statement, so when several requests race here exactly one of them wins.
      const [taken] = await IdempotencyKey.update(
        { expiresAt },
        { where: { id: existing.id, status: "in_progress", updatedAt: { [Op.lt]: staleBefore } } }
      );
      if (taken === 0) throw new HttpException(409, "A request with this Idempotency-Key is still being processed");
      record = existing;
    }

    try {
      const value = await handler();
      await IdempotencyKey.update(
        { status: "completed", responseStatus: options.responseStatus || 200, responseBody: value === undefined ? null : (value as any) },
        { where: { id: record.id } }
      );
      return { replayed: false, value };
    } catch (error) {
      // Release the key so the client can retry; an unfinished attempt must not lock them out.
      await IdempotencyKey.destroy({ where: { id: record.id } }).catch((): undefined => undefined);
      throw error;
    }
  }
}
