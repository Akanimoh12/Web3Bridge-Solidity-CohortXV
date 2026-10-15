import { NextResponse } from "next/server";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_METADATA_SIZE = 64 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const pinataJwt = process.env.PINATA_JWT;
  if (!pinataJwt) {
    return NextResponse.json({ error: "IPFS uploads are not configured on the server." }, { status: 503 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }

  const isMetadata = file.type === "application/json";
  if (!isMetadata && !ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Upload a PNG, JPEG, WebP, GIF image, or NFT metadata JSON file." }, { status: 415 });
  }

  const sizeLimit = isMetadata ? MAX_METADATA_SIZE : MAX_IMAGE_SIZE;
  if (file.size === 0 || file.size > sizeLimit) {
    const limitMb = isMetadata ? 0.064 : 8;
    return NextResponse.json({ error: `File must be non-empty and no larger than ${limitMb} MB.` }, { status: 413 });
  }

  const pinataForm = new FormData();
  pinataForm.append("network", "public");
  pinataForm.append("file", file, file.name);

  const response = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${pinataJwt}` },
    body: pinataForm,
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ error: `Pinata upload failed (HTTP ${response.status}).` }, { status: 502 });
  }

  const result: unknown = await response.json();
  if (
    typeof result !== "object" ||
    result === null ||
    !("data" in result) ||
    typeof result.data !== "object" ||
    result.data === null ||
    !("cid" in result.data) ||
    typeof result.data.cid !== "string"
  ) {
    return NextResponse.json({ error: "Pinata returned an unexpected upload response." }, { status: 502 });
  }

  return NextResponse.json({ cid: result.data.cid });
}
