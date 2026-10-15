
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_JSON_SIZE = 32 * 1024;
const MAX_REQUEST_SIZE = 6 * 1024 * 1024;

const allowedImages = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Read the request with a maximum size before parsing it.
async function readLimitedFormData(
  request: Request,
): Promise<FormData> {
  const contentType = request.headers.get("content-type");

  if (!contentType?.startsWith("multipart/form-data")) {
    throw new Error("INVALID_CONTENT_TYPE");
  }

  if (!request.body) {
    throw new Error("EMPTY_REQUEST");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      total += value.byteLength;

      if (total > MAX_REQUEST_SIZE) {
        await reader.cancel();
        throw new Error("REQUEST_TOO_LARGE");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const buffer = new ArrayBuffer(total);
  const bytes = new Uint8Array(buffer);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const parsedRequest = new Request(request.url, {
    method: "POST",
    headers: { "content-type": contentType },
    body: buffer,
  });

  return parsedRequest.formData();
}

// Check the actual image header, not only its MIME type.
async function validImage(file: File): Promise<boolean> {
  const bytes = new Uint8Array(
    await file.slice(0, 12).arrayBuffer(),
  );

  if (file.type === "image/png") {
    return (
      bytes.length >= 8 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every(
        (value, index) => bytes[index] === value,
      )
    );
  }

  if (file.type === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 255 &&
      bytes[1] === 216 &&
      bytes[2] === 255
    );
  }

  if (file.type === "image/gif") {
    const header = new TextDecoder().decode(bytes.slice(0, 6));
    return header === "GIF87a" || header === "GIF89a";
  }

  if (file.type === "image/webp") {
    const decoder = new TextDecoder();
    return (
      decoder.decode(bytes.slice(0, 4)) === "RIFF" &&
      decoder.decode(bytes.slice(8, 12)) === "WEBP"
    );
  }

  return false;
}

async function validMetadata(file: File): Promise<boolean> {
  try {
    const data: unknown = JSON.parse(await file.text());

    if (!data || typeof data !== "object") {
      return false;
    }

    const metadata = data as Record<string, unknown>;

    return (
      typeof metadata.name === "string" &&
      metadata.name.trim().length > 0 &&
      metadata.name.length <= 80 &&
      typeof metadata.description === "string" &&
      metadata.description.length <= 500 &&
      typeof metadata.image === "string" &&
      /^ipfs:\/\/[a-zA-Z0-9]+$/.test(metadata.image)
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const token = process.env.PINATA_JWT;

  if (!token) {
    console.error("Pinata JWT is not configured");
    return jsonError("Upload service unavailable", 503);
  }

  // Basic browser cross-origin protection.
  // This is not authentication or rate limiting.
  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return jsonError("Cross-origin upload denied", 403);
  }

  const declaredSize = Number(
    request.headers.get("content-length") ?? 0,
  );

  if (declaredSize > MAX_REQUEST_SIZE) {
    return jsonError("Request exceeds 6 MB", 413);
  }

  let form: FormData;

  try {
    form = await readLimitedFormData(request);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "REQUEST_TOO_LARGE"
    ) {
      return jsonError("Request exceeds 6 MB", 413);
    }

    return jsonError("Invalid upload request", 400);
  }

  const file = form.get("file");

  if (!(file instanceof File)) {
    return jsonError("No file provided", 400);
  }

  if (file.size === 0) {
    return jsonError("Empty files are not allowed", 400);
  }

  if (file.type === "application/json") {
    if (
      file.size > MAX_JSON_SIZE ||
      !(await validMetadata(file))
    ) {
      return jsonError("Invalid NFT metadata JSON", 400);
    }
  } else if (allowedImages.has(file.type)) {
    if (
      file.size > MAX_IMAGE_SIZE ||
      !(await validImage(file))
    ) {
      return jsonError("Invalid image or image exceeds 5 MB", 400);
    }
  } else {
    return jsonError("Unsupported file type", 415);
  }

  const body = new FormData();
  body.append("network", "public");
  body.append("file", file, file.name);

  try {
    const response = await fetch(
      "https://uploads.pinata.cloud/v3/files",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body,
        signal: AbortSignal.timeout(60_000),
      },
    );

    if (!response.ok) {
      console.error(
        "Pinata upload failed with status:",
        response.status,
      );

      return jsonError("IPFS upload failed", 502);
    }

    const result = (await response.json()) as {
      data?: { cid?: string };
    };

    const cid = result.data?.cid;

    if (!cid) {
      return jsonError("Pinata did not return a CID", 502);
    }

    return NextResponse.json({
      cid,
      uri: `ipfs://${cid}`,
    });
  } catch (error) {
    console.error(
      "IPFS upload request failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return jsonError("Upload service temporarily unavailable", 502);
  }
}
