"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { RefreshCw, Image as ImageIcon } from "lucide-react";
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
  // Create an array of token IDs in reverse chronological order (newest first)
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
        <div>
          <h2 className="text-lg font-bold text-black flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-600"></span>
            Minted NFT Gallery
          </h2>
          <p className="text-xs text-neutral-500">
            Every token minted with IPFS artwork, owner ENS identity, and live USD value
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            Total Minted: {count}
          </span>
          <button
            onClick={() => refetchTotal()}
            title="Refresh gallery"
            className="rounded-lg border border-neutral-200 p-1.5 text-xs text-neutral-600 hover:border-blue-400 hover:text-blue-600 transition"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Manual lookup input */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
        <input
          type="number"
          placeholder="Look up specific Token ID..."
          value={manualTokenId}
          onChange={(e) => setManualTokenId(e.target.value)}
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-black placeholder-neutral-400 focus:border-blue-600 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 transition"
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
            className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-500 hover:text-black"
          >
            Clear
          </button>
        )}
      </form>

      {searchedId !== null && (
        <div className="pt-2">
          <h3 className="text-xs font-semibold text-neutral-600 mb-2">
            Inspecting Token #{searchedId}:
          </h3>
          <div className="max-w-xs">
            <NftCard tokenId={BigInt(searchedId)} />
          </div>
        </div>
      )}

      {/* Grid of all minted tokens */}
      {tokenIds.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {tokenIds.map((id) => (
            <NftCard key={id.toString()} tokenId={id} />
          ))}
        </div>
      ) : count === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 p-8 text-center">
          <ImageIcon className="mx-auto h-10 w-10 text-blue-300 mb-2" />
          <h4 className="text-sm font-semibold text-neutral-800">No NFTs minted yet</h4>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            Be the first to mint! Upload an image above to pin it to IPFS and mint it on Sepolia.
          </p>
        </div>
      ) : null}
    </div>
  );
}
