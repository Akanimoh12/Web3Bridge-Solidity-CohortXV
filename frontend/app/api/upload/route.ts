import { NextResponse } from "next/server";

const PINATA_API = "https://api.pinata.cloud/pinning";

async function pinFile(file: File, jwt: string) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${PINATA_API}/pinFileToIPFS`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: formData,
  });

  if (!response.ok) throw new Error("Could not upload image to IPFS");
  const data = (await response.json()) as { IpfsHash?: string };
  if (!data.IpfsHash) throw new Error("IPFS did not return an image CID");
  return data.IpfsHash;
}

async function pinMetadata(
  metadata: { name: string; description: string; image: string },
  jwt: string,
) {
  const response = await fetch(`${PINATA_API}/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: { name: `${metadata.name} class card` },
    }),
  });

  if (!response.ok) throw new Error("Could not upload metadata to IPFS");
  const data = (await response.json()) as { IpfsHash?: string };
  if (!data.IpfsHash) throw new Error("IPFS did not return a metadata CID");
  return data.IpfsHash;
}

export async function POST(request: Request) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return NextResponse.json({ error: "PINATA_JWT is not configured" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const name = formData.get("name");
    const bio = formData.get("bio");

    if (!(file instanceof File) || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Choose an image file" }, { status: 400 });
    }
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const imageCid = await pinFile(file, jwt);
    const metadataCid = await pinMetadata(
      {
        name: name.trim(),
        description: typeof bio === "string" ? bio.trim() : "",
        image: `ipfs://${imageCid}`,
      },
      jwt,
    );

    return NextResponse.json({ tokenUri: `ipfs://${metadataCid}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}