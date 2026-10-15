"use client";

import { useState } from "react";
import { MintStudio } from "@/components/MintStudio";
import { Gallery } from "@/components/Gallery";

export default function NftPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-black">IPFS NFT Studio</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Decentralized minting powered by Pinata IPFS and Sepolia ERC-721
        </p>
      </div>

      <MintStudio onMintSuccess={() => setRefreshKey((k) => k + 1)} />

      <div className="pt-4 border-t border-neutral-200">
        <Gallery key={refreshKey} />
      </div>
    </div>
  );
}
