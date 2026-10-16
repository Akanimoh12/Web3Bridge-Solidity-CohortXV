import { NextRequest, NextResponse } from "next/server";

// Server-side RPC proxy route for Pimlico ERC-4337 Bundler & Paymaster
export async function POST(req: NextRequest) {
  const rawKey = process.env.PIMLICO_API_KEY;
  const apiKey = rawKey?.trim().replace(/^["']|["']$/g, "");
  if (!apiKey) {
    return NextResponse.json(
      { error: "PIMLICO_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();

    const pimlicoUrl = `https://api.pimlico.io/v2/sepolia/rpc?apikey=${apiKey}`;
    const response = await fetch(pimlicoUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err: unknown) {
    console.error("Pimlico proxy error:", err);
    return NextResponse.json(
      { error: "Failed to forward request to Pimlico", details: String(err) },
      { status: 500 }
    );
  }
}
