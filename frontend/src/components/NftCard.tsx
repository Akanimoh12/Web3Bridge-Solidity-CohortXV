"use client";

import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Image as ImageIcon, ArrowUpRight } from "lucide-react";
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
    <div className="group flex flex-col overflow-hidden rounded-3xl border border-neutral-200/90 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-300 hover:border-blue-400 hover:shadow-xl">
      {/* Artwork Canvas */}
      <div className="relative aspect-square w-full bg-neutral-100/70 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={metadata?.name || `Token #${tokenId.toString()}`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://placehold.co/400x400/2563eb/ffffff?text=IPFS+Image";
            }}
          />
        ) : loadingMeta ? (
          <div className="text-xs text-blue-600 animate-pulse font-semibold">
            Fetching IPFS…
          </div>
        ) : metaError ? (
          <div className="text-xs text-neutral-400 p-2 text-center">IPFS Pin Active</div>
        ) : (
          <ImageIcon className="h-10 w-10 text-neutral-300" />
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3">
          <span className="rounded-full bg-black/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-extrabold text-white shadow-xs">
            #{tokenId.toString()}
          </span>
        </div>

        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition duration-200">
          <span className="rounded-full bg-white/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-blue-700 shadow-xs">
            Sepolia
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-5 justify-between space-y-4">
        <div>
          <h3 className="font-extrabold text-sm text-neutral-900 group-hover:text-blue-600 transition truncate">
            {metadata?.name || `ClassNFT #${tokenId.toString()}`}
          </h3>
          <p className="mt-1 text-xs text-neutral-500 line-clamp-2 leading-relaxed">
            {metadata?.description || "Decentralized IPFS digital artifact minted on Ethereum Sepolia."}
          </p>
        </div>

        {/* Owner & Price Info */}
        <div className="space-y-2 pt-3 border-t border-neutral-100 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-400">Owner:</span>
            <EnsAddress address={owner} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-400">Oracle Value:</span>
            <span className="font-bold text-neutral-900">
              {nominalUsd ? (
                <>
                  <span className="text-blue-600">${nominalUsd}</span>{" "}
                  <span className="text-[10px] text-neutral-400 font-normal">USD</span>
                </>
              ) : (
                "0.01 ETH"
              )}
            </span>
          </div>
        </div>

        {/* Links bar with clean circular buttons */}
        {uri && (
          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px]">
            <a
              href={ipfsToHttp(uri)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 transition"
            >
              <span>IPFS Metadata</span>
              <ArrowUpRight className="h-3 w-3" />
            </a>

            <a
              href={`https://sepolia.etherscan.io/token/${NFT_ADDRESS}?a=${tokenId.toString()}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-neutral-400 hover:text-neutral-900 transition"
            >
              <span>Etherscan</span>
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
