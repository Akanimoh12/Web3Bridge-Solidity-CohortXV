"use client";

import { useState } from "react";
import { MintStudio } from "@/components/MintStudio";
import { Gallery } from "@/components/Gallery";
import { Sparkles } from "lucide-react";

export default function NftPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-10 pb-12">
      <div className="pt-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200/60 mb-2">
          <Sparkles className="h-3 w-3 text-blue-600" />
          <span>IPFS Powered Studio</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
          Decentralized NFT Minting
        </h1>
        <p className="text-xs text-neutral-500 mt-1 max-w-xl">
          Pin media and metadata directly to IPFS through Pinata, then broadcast mint transactions on Ethereum Sepolia.
        </p>
      </div>

      <MintStudio onMintSuccess={() => setRefreshKey((k) => k + 1)} />

      <div className="pt-8 border-t border-neutral-200/80">
        <Gallery key={refreshKey} />
      </div>
    </div>
  );
}
