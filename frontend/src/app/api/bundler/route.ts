import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 64 * 1024;

const ALLOWED_METHODS = new Set([
  "eth_chainId",
  "eth_supportedEntryPoints",
  "eth_estimateUserOperationGas",
  "eth_sendUserOperation",
  "eth_getUserOperationReceipt",
  "eth_getUserOperationByHash",
  "pimlico_getUserOperationGasPrice",
  "pm_sponsorUserOperation",
  "pm_getPaymasterData",
  "pm_getPaymasterStubData",
]);

const SPONSOR_METHODS = new Set([
  "eth_sendUserOperation",
  "pm_sponsorUserOperation",
  "pm_getPaymasterData",
  "pm_getPaymasterStubData",
]);

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const apiKey = process.env.PIMLICO_API_KEY;

  if (!apiKey) {
    return fail("Pimlico is not configured", 503);
  }

  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return fail("Cross-origin request denied", 403);
  }

  if (
    !request.headers.get("content-type")?.includes("application/json")
  ) {
    return fail("JSON required", 415);
  }

  const declaredSize = Number(
    request.headers.get("content-length") ?? 0
  );

  if (declaredSize > MAX_BYTES) {
    return fail("Request too large", 413);
  }

  let body: string;

  try {
    const reader = request.body?.getReader();
    if (!reader) return fail("Empty request", 400);

    const chunks: Uint8Array[] = [];
    let total = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        total += value.byteLength;

        if (total > MAX_BYTES) {
          await reader.cancel();
          return fail("Request too large", 413);
        }

        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const bytes = new Uint8Array(total);
    let offset = 0;

    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    body = new TextDecoder().decode(bytes);
  } catch {
    return fail("Invalid request body", 400);
  }

  let payload: unknown;

  try {
    payload = JSON.parse(body);
  } catch {
    return fail("Invalid JSON", 400);
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return fail("Invalid JSON-RPC request", 400);
  }

  const rpc = payload as Record<string, unknown>;

  if (
    rpc.jsonrpc !== "2.0" ||
    typeof rpc.method !== "string" ||
    !ALLOWED_METHODS.has(rpc.method) ||
    !Array.isArray(rpc.params)
  ) {
    return fail("RPC method not permitted", 403);
  }

  if (
    SPONSOR_METHODS.has(rpc.method) &&
    process.env.PIMLICO_ALLOW_WRITES !== "true"
  ) {
    return fail("Smart account submissions are disabled", 403);
  }

  const url = new URL(
    "https://api.pimlico.io/v2/11155111/rpc"
  );
  url.searchParams.set("apikey", apiKey);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });

    return new Response(await response.text(), {
      status: response.status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return fail("Bundler temporarily unavailable", 502);
  }
}
