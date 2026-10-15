// Sends one file to OUR server route (/api/upload), which sends it to Pinata with the secret key.
// Returns the CID: the fingerprint of the file on IPFS.
export async function uploadToIpfs(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch("/api/upload", { method: "POST", body: form });
  const result: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
        ? result.error
        : "The file could not be uploaded to IPFS.";
    throw new Error(message);
  }
  if (
    typeof result !== "object" ||
    result === null ||
    !("cid" in result) ||
    typeof result.cid !== "string"
  ) {
    throw new Error("The IPFS upload route returned an invalid response.");
  }
  return result.cid;
}

export type NftMetadata = {
  name: string;
  description: string;
  image: string;
  referenceEth: string;
};

export async function uploadNft(
  image: File,
  name: string,
  description: string,
  referenceEth: string,
): Promise<string> {
  const imageCid = await uploadToIpfs(image);
  const metadata: NftMetadata = { name, description, image: `ipfs://${imageCid}`, referenceEth };
  const metadataFile = new File([JSON.stringify(metadata)], "metadata.json", { type: "application/json" });
  const metadataCid = await uploadToIpfs(metadataFile);
  return `ipfs://${metadataCid}`;
}
