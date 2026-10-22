/**
 * Why a Paga call failed matters for money:
 *  - "api"      Paga answered and said no. The operation definitely did NOT happen (safe to refund/retry).
 *  - "network"  we don't know whether Paga received it (timeout, connection reset, 5xx).
 *               For anything that moves money this is an UNKNOWN outcome: never refund on this alone,
 *               resolve it by asking Paga for the status of the same reference.
 */
export class PagaError extends Error {
  readonly kind: "api" | "network" | "invalid_response";
  readonly code: string | number | null;
  readonly httpStatus: number | null;
  readonly outcomeUnknown: boolean;

  constructor(
    message: string,
    options: { kind: "api" | "network" | "invalid_response"; code?: string | number | null; httpStatus?: number | null; outcomeUnknown?: boolean }
  ) {
    super(message);
    this.name = "PagaError";
    this.kind = options.kind;
    this.code = options.code === undefined ? null : options.code;
    this.httpStatus = options.httpStatus === undefined ? null : options.httpStatus;
    this.outcomeUnknown = options.outcomeUnknown === undefined ? options.kind !== "api" : options.outcomeUnknown;
  }
}
