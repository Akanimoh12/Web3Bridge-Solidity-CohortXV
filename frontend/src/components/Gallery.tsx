"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { RefreshCw, Image as ImageIcon, Search } from "lucide-react";
import { NFT_ADDRESS, nftAbi } from "@/contracts/nft";
import { NftCard } from "./NftCard";

export function Gallery() {
  const [manualTokenId, setManualTokenId] = useState<string>("");
  const [searchedId, setSearchedId] = useState<string | null>(null);

  const { data: totalMinted, refetch: refetchTotal } = useReadContract({
    address: NFT_ADDRESS,
    abi: nftAbi,
    functionName: "totalMinted",
    chainId: sepolia.id,
    query: { retry: false },
  });

  const count = totalMinted !== undefined ? Number(totalMinted) : 0;
  // Reverse chronological array of token IDs
  const tokenIds: bigint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    tokenIds.push(BigInt(i));
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualTokenId.trim() !== "") {
      setSearchedId(manualTokenId.trim());
    } else {
      setSearchedId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
            On-Chain Collection
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900 mt-0.5">
            Minted NFT Gallery
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Decentralized metadata stored on IPFS, resolved via ENS, with live Chainlink valuations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200/80">
            Total Minted: {count}
          </span>
          <button
            onClick={() => refetchTotal()}
            title="Refresh gallery collection"
            className="rounded-full border border-neutral-200 bg-white p-2 text-neutral-600 hover:border-blue-400 hover:text-blue-600 shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Search Bar matching pill aesthetic */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="number"
            placeholder="Search by Token ID..."
            value={manualTokenId}
            onChange={(e) => setManualTokenId(e.target.value)}
            className="w-full rounded-full border border-neutral-200/90 bg-neutral-50/50 pl-9 pr-4 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:border-blue-600 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 shadow-xs transition cursor-pointer"
        >
          Inspect
        </button>
        {searchedId !== null && (
          <button
            type="button"
            onClick={() => {
              setSearchedId(null);
              setManualTokenId("");
            }}
            className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-600 hover:text-black transition"
          >
            Reset
          </button>
        )}
      </form>

      {searchedId !== null && (
        <div className="pt-2">
          <h3 className="text-xs font-bold text-neutral-700 mb-3">
            Inspecting Token #{searchedId}:
          </h3>
          <div className="max-w-xs">
            <NftCard tokenId={BigInt(searchedId)} />
          </div>
        </div>
      )}

      {/* Grid of Cards */}
      {tokenIds.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {tokenIds.map((id) => (
            <NftCard key={id.toString()} tokenId={id} />
          ))}
        </div>
      ) : count === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-200 bg-white p-12 text-center shadow-[0_4px_25px_rgb(0,0,0,0.02)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-3">
            <ImageIcon className="h-7 w-7" />
          </div>
          <h4 className="text-base font-bold text-neutral-800">No NFTs minted on-chain yet</h4>
          <p className="text-xs text-neutral-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
            Be the first to mint! Upload an image in the Mint Studio above to pin to IPFS and mint on Sepolia.
          </p>
        </div>
      ) : null}
    </div>
  );
}
