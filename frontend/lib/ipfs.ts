const GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://ipfs.io/ipfs/";

export function ipfsToHttp(uri: string) {
  return uri.startsWith("ipfs://") ? GATEWAY + uri.slice("ipfs://".length) : uri;
}