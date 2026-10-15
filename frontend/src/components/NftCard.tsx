"use client";

import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Image as ImageIcon, ExternalLink } from "lucide-react";
import { NFT_ADDRESS, nftAbi, ipfsToHttp } from "@/contracts/nft";
import { EnsAddress } from "./EnsAddress";
import { useChainlinkPrice } from "@/hooks/useChainlinkPrice";

interface NftMetadata {
  name?: string;
  description?: string;
  image?: string;
}

interface NftCardProps {
  tokenId: bigint;
}

export function NftCard({ tokenId }: NftCardProps) {
  const { price: ethPrice } = useChainlinkPrice();
  const [metadata, setMetadata] = useState<NftMetadata | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [metaError, setMetaError] = useState(false);

  const { data: uri } = useReadContract({
    address: NFT_ADDRESS,
    abi: nftAbi,
    functionName: "tokenURI",
    args: [tokenId],
    chainId: sepolia.id,
  });

  const { data: owner } = useReadContract({
    address: NFT_ADDRESS,
    abi: nftAbi,
    functionName: "ownerOf",
    args: [tokenId],
    chainId: sepolia.id,
  });

  useEffect(() => {
    let active = true;
    if (!uri) return;

    setLoadingMeta(true);
    setMetaError(false);

    const httpUrl = ipfsToHttp(uri);
    fetch(httpUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Metadata fetch failed");
        return res.json();
      })
      .then((data) => {
        if (active) {
          setMetadata(data);
          setLoadingMeta(false);
        }
      })
      .catch((err) => {
        console.warn(`Could not load metadata for token ${tokenId}:`, err);
        if (active) {
          setMetaError(true);
          setLoadingMeta(false);
        }
      });

    return () => {
      active = false;
    };
  }, [uri, tokenId]);

  // Nominal mint value in USD at today's ETH price (e.g. 0.01 ETH)
  const nominalEth = 0.01;
  const nominalUsd = ethPrice ? (nominalEth * ethPrice).toFixed(2) : null;

  const imageUrl = metadata?.image ? ipfsToHttp(metadata.image) : null;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md hover:border-blue-300">
      <div className="relative aspect-square w-full bg-neutral-100 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={metadata?.name || `Token #${tokenId.toString()}`}
            className="h-full w-full object-cover transition duration-300 hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://placehold.co/400x400/2563eb/ffffff?text=IPFS+Image";
            }}
          />
        ) : loadingMeta ? (
          <div className="text-xs text-blue-600 animate-pulse font-medium">Loading from IPFS…</div>
        ) : metaError ? (
          <div className="text-xs text-neutral-400 p-2 text-center">Metadata on IPFS</div>
        ) : (
          <ImageIcon className="h-8 w-8 text-blue-300" />
        )}
        <span className="absolute top-2 right-2 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
          #{tokenId.toString()}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 justify-between space-y-3">
        <div>
          <h3 className="font-bold text-sm text-black truncate">
            {metadata?.name || `ClassNFT #${tokenId.toString()}`}
          </h3>
          <p className="mt-1 text-xs text-neutral-500 line-clamp-2">
            {metadata?.description || "No description provided."}
          </p>
        </div>

        <div className="space-y-2 pt-2 border-t border-neutral-100 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-500">Owner:</span>
            <EnsAddress address={owner} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-500">Value (0.01 ETH):</span>
            <span className="font-semibold text-blue-700">
              {nominalUsd ? `$${nominalUsd} USD` : "—"}
            </span>
          </div>
        </div>

        {uri && (
          <div className="pt-1 flex items-center justify-between text-[11px]">
            <a
              href={ipfsToHttp(uri)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"
            >
              <span>IPFS URI</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
            <a
              href={`https://sepolia.etherscan.io/token/${NFT_ADDRESS}?a=${tokenId.toString()}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-neutral-500 hover:text-black"
            >
              <span>Etherscan</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
