import { PagaError } from "./errors";
import { PagaRequest, PagaResponse, PagaTransport } from "./config";

/** Default transport using the platform fetch (Node 18+). */
export const fetchTransport: PagaTransport = async (request: PagaRequest): Promise<PagaResponse> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), request.timeoutMs);

  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      signal: controller.signal,
    });

    const text = await response.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch (_error) {
      body = { raw: text };
    }
    return { status: response.status, body };
  } catch (error: any) {
    // We cannot tell whether Paga received the request. Callers decide what that means.
    throw new PagaError(
      error && error.name === "AbortError" ? "Paga request timed out" : "Could not reach Paga: " + (error && error.message),
      { kind: "network", outcomeUnknown: true }
    );
  } finally {
    clearTimeout(timer);
  }
};
