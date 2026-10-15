import { NextResponse } from "next/server";

// This file runs on the server, never in the browser. So the secret PINATA_JWT stays secret.
// Pinata Files API v3: https://docs.pinata.cloud
export async function POST(req: Request) {
  try {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      return NextResponse.json(
        { error: "Server error: PINATA_JWT is not configured in environment variables." },
        { status: 500 }
      );
    }

    // 1. Take the file the browser sent us
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 2. Send it to Pinata with our secret key on the public IPFS network
    const body = new FormData();
    body.append("network", "public");
    body.append("file", file, file.name);

    const res = await fetch("https://uploads.pinata.cloud/v3/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body,
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: json.error || "Pinata upload failed", details: json },
        { status: res.status }
      );
    }

    // 3. Return the CID
    return NextResponse.json({ cid: json.data.cid });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
