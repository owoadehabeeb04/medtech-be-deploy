import assert from "assert";
import { normalizeDrugstoreProxyError } from "../src/modules/drugstore/DrugstoreProxyError";

const upstreamRateLimit = normalizeDrugstoreProxyError({
	response: {
		status: 429,
		data: { message: "Too many internal requests. Try again shortly." },
		headers: { "retry-after": "30" },
	},
});
assert.equal(upstreamRateLimit.statusCode, 429);
assert.equal(upstreamRateLimit.message, "Too many internal requests. Try again shortly.");
assert.equal(upstreamRateLimit.retryAfter, "30");

assert.deepEqual(normalizeDrugstoreProxyError({ response: { status: 400 } }), {
	statusCode: 400,
	message: "Merchant service rejected the request.",
});

assert.deepEqual(normalizeDrugstoreProxyError({ response: { status: 503 } }), {
	statusCode: 502,
	message: "Merchant service returned an error.",
});

assert.deepEqual(normalizeDrugstoreProxyError({ code: "ECONNABORTED", message: "timeout of 10000ms exceeded" }), {
	statusCode: 504,
	message: "Merchant service request timed out.",
});

assert.deepEqual(normalizeDrugstoreProxyError({ code: "ECONNREFUSED" }), {
	statusCode: 503,
	message: "Merchant service is unavailable.",
});

assert.deepEqual(normalizeDrugstoreProxyError(new Error("unexpected proxy error")), {
	statusCode: 502,
	message: "Merchant service request failed.",
});

process.stdout.write("Drugstore proxy error tests passed.\n");
