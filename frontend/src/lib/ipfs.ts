export type NftMetadata = { name: string; description: string; image: string };

export function ipfsToHttp(uri: string) {
  if (!uri.startsWith("ipfs://")) return uri;
  return `https://ipfs.io/ipfs/${uri.slice(7).replace(/^ipfs\//, "")}`;
}

export async function uploadToIpfs(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "The IPFS upload failed. Please try again.");
  if (typeof json.cid !== "string" || !json.cid) throw new Error("Pinata did not return a CID.");
  return json.cid as string;
}

// Uploads the image, then the metadata JSON that points to it. Returns "ipfs://<metadata CID>".
export async function uploadNft(image: File, name: string, description: string): Promise<string> {
  const imageCid = await uploadToIpfs(image);
  const metadata = { name, description, image: `ipfs://${imageCid}` };
  const metadataFile = new File([JSON.stringify(metadata)], "metadata.json", { type: "application/json" });
  const metadataCid = await uploadToIpfs(metadataFile);
  return `ipfs://${metadataCid}`;
}

export async function fetchNftMetadata(uri: string): Promise<NftMetadata> {
  const response = await fetch(ipfsToHttp(uri));
  if (!response.ok) throw new Error("The metadata could not be loaded from IPFS yet. Try again in a moment.");
  const metadata = (await response.json()) as Partial<NftMetadata>;
  if (!metadata.name || !metadata.description || !metadata.image) throw new Error("This token does not contain valid profile metadata.");
  return metadata as NftMetadata;
}
