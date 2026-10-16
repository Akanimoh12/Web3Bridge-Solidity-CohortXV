import { isAddress, zeroAddress, type Address } from "viem";

const configuredAddress = process.env.NEXT_PUBLIC_NFT_ADDRESS;
const deployedAddress: Address = "0x089301ED48D1f2532Ddbb06b1069E194009DF052";
const collectionAddress = configuredAddress ?? deployedAddress;
export const NFT_ADDRESS: Address | undefined =
  isAddress(collectionAddress) ? collectionAddress : undefined;
export const NFT_CONTRACT_ADDRESS = NFT_ADDRESS ?? zeroAddress;

export const nftAbi = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "uri", type: "string" }], outputs: [{ name: "tokenId", type: "uint256" }] },
  { type: "function", name: "tokenURI", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "string" }] },
  { type: "function", name: "ownerOf", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "totalMinted", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "event",
    name: "Minted",
    inputs: [
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "uri", type: "string", indexed: false },
    ],
  },
] as const;

export function ipfsToHttp(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    const cidAndPath = uri.slice("ipfs://".length).replace(/^ipfs\//, "");
    const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";
    return `${gateway.replace(/\/$/, "")}/${cidAndPath}`;
  }
  return uri;
}
