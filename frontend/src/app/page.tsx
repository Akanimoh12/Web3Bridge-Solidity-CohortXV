"use client";

import { useState } from "react";
import { EnsLookupCard } from "@/components/EnsLookupCard";
import { MintStudio } from "@/components/MintStudio";
import { Gallery } from "@/components/Gallery";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"mint" | "gallery" | "ens">("mint");
  const [galleryRefreshKey, setGalleryRefreshKey] = useState(0);

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="text-center space-y-3 py-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1 text-xs font-semibold text-blue-700 shadow-sm">
          <span>⚡ Web3Bridge Cohort XV · Day 3</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
          Decentralized <span className="text-blue-600">NFT Studio</span> & Gallery
        </h1>
        <p className="mx-auto max-w-2xl text-xs sm:text-sm text-neutral-600">
          Upload media securely to IPFS through Pinata, mint ERC-721 tokens on Sepolia, resolve on-chain identities with ENS, and value assets using live Chainlink price feeds.
        </p>

        {/* 3 Pillars Summary Bar */}
        <div className="mx-auto grid max-w-2xl grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-left">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3">
            <span className="text-xs font-bold text-black flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              1. ENS Resolver
            </span>
            <p className="mt-1 text-[11px] text-neutral-500">
              Reverse resolves every owner address and looks up any .eth name.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3">
            <span className="text-xs font-bold text-black flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              2. Pinata IPFS
            </span>
            <p className="mt-1 text-[11px] text-neutral-500">
              Server-side route keeps API keys private. No browser exposure.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3">
            <span className="text-xs font-bold text-black flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              3. Chainlink Feeds
            </span>
            <p className="mt-1 text-[11px] text-neutral-500">
              Live ETH/USD price on Sepolia auto-refreshes every 15s.
            </p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200">
        <button
          onClick={() => setActiveTab("mint")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs sm:text-sm font-semibold transition ${
            activeTab === "mint"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-neutral-500 hover:text-black"
          }`}
        >
          <span>🎨</span>
          <span>Mint Studio</span>
        </button>
        <button
          onClick={() => setActiveTab("gallery")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs sm:text-sm font-semibold transition ${
            activeTab === "gallery"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-neutral-500 hover:text-black"
          }`}
        >
          <span>🖼️</span>
          <span>Gallery</span>
        </button>
        <button
          onClick={() => setActiveTab("ens")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs sm:text-sm font-semibold transition ${
            activeTab === "ens"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-neutral-500 hover:text-black"
          }`}
        >
          <span>🔍</span>
          <span>ENS Lookup</span>
        </button>
      </div>

      {/* Tab Content */}
      <section className="space-y-8">
        {activeTab === "mint" && (
          <div className="space-y-8">
            <MintStudio
              onMintSuccess={() => {
                setGalleryRefreshKey((k) => k + 1);
              }}
            />
            <div className="pt-4 border-t border-neutral-200">
              <Gallery key={galleryRefreshKey} />
            </div>
          </div>
        )}

        {activeTab === "gallery" && (
          <Gallery key={galleryRefreshKey} />
        )}

        {activeTab === "ens" && (
          <div className="space-y-6">
            <EnsLookupCard />
          </div>
        )}
      </section>
    </div>
  );
}
