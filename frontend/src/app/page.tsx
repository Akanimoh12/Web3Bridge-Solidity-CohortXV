"use client";

import { useState } from "react";
import {
  Sparkles,
  Paintbrush,
  Image as ImageIcon,
  Search,
  ArrowUpRight,
  MousePointer2,
  ShieldCheck,
  Activity,
  Layers
} from "lucide-react";
import { EnsLookupCard } from "@/components/EnsLookupCard";
import { MintStudio } from "@/components/MintStudio";
import { Gallery } from "@/components/Gallery";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"mint" | "gallery" | "ens">("mint");
  const [galleryRefreshKey, setGalleryRefreshKey] = useState(0);

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section inspired by _ (4).jpeg & Desain UI.jpeg */}
      <section className="relative pt-6 pb-4 text-center">
        {/* Subtle Decorative 4-Point Stars */}
        <div className="absolute top-2 left-4 text-blue-400/50 hidden sm:block">
          <svg className="w-6 h-6 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
        </div>
        <div className="absolute top-10 right-6 text-neutral-300 hidden sm:block">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
        </div>
        <div className="absolute bottom-4 left-12 text-neutral-300/60 hidden md:block">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
        </div>

        {/* Floating Collaborator Tags from _ (4).jpeg */}
        <div className="absolute top-14 left-0 lg:-left-6 hidden md:flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/80 px-3 py-1 text-xs font-semibold text-blue-700 shadow-xs hover:scale-105 transition">
          <MousePointer2 className="h-3.5 w-3.5 text-blue-600 fill-blue-600" />
          <span>vitalik.eth</span>
        </div>

        <div className="absolute top-20 right-0 lg:-right-6 hidden md:flex items-center gap-1.5 rounded-full bg-black text-white px-3 py-1 text-xs font-semibold shadow-xs hover:scale-105 transition">
          <Sparkles className="h-3 w-3 text-blue-400" />
          <span>Sepolia 0xeDe6…a60</span>
        </div>


        {/* Headline with Playful Pill Badge (from Desain UI) */}
        <h1 className="mx-auto max-w-4xl text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-900 leading-[1.15]">
          Level Up Your Identity{" "}
          <span className="block mt-1 sm:mt-2">
            with Our{" "}
            <span className="inline-flex items-center align-middle mx-1 px-3 sm:px-4 py-1 rounded-full bg-blue-600 text-white text-xl sm:text-3xl font-bold shadow-xs">
              ✦ IPFS
            </span>{" "}
            NFT Studio
          </span>
        </h1>

        <p className="mx-auto max-w-2xl mt-4 text-xs sm:text-sm text-neutral-600 leading-relaxed">
          Upload media securely to IPFS through Pinata, mint ERC-721 tokens on Sepolia, resolve on-chain identities with ENS, and value assets using live Chainlink feeds.
        </p>

        {/* Sub-bar metrics with Action Button */}
        <div className="mx-auto mt-6 flex max-w-xl flex-wrap items-center justify-center gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600"></span>
            <span className="font-semibold text-neutral-800">100% Server Pinata IPFS</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            <span className="font-semibold text-neutral-800">Mainnet ENS Resolver</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-400"></span>
            <span className="font-semibold text-neutral-800">Live Chainlink USD</span>
          </div>
        </div>
      </section>

      {/* 3 Core Architecture Cards (Inspired by "Our Class" in Desain UI.jpeg) */}
      <section className="rounded-3xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-[0_4px_25px_rgb(0,0,0,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-neutral-100">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Architecture & Features
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900 mt-0.5">
              Core Decentralized Pillars
            </h2>
          </div>
          <p className="text-xs text-neutral-500 max-w-xs">
            Integrated Web3 primitives working seamlessly across Sepolia and Ethereum Mainnet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-6">
          {/* Pillar 1 */}
          <div
            onClick={() => setActiveTab("mint")}
            className="group relative flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-neutral-50/40 p-5 hover:border-blue-400 hover:bg-white hover:shadow-lg transition-all duration-300 cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 group-hover:bg-blue-600 group-hover:text-white transition">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-neutral-900 group-hover:text-blue-600 transition">
                Pinata IPFS Pinning
              </h3>
              <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed">
                Server-side Next.js route pins media and metadata securely. Zero secret leak to client bundle.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-blue-700">Open Studio</span>
              <span className="text-neutral-400 font-mono">/api/upload</span>
            </div>
          </div>

          {/* Pillar 2 */}
          <div
            onClick={() => setActiveTab("ens")}
            className="group relative flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-neutral-50/40 p-5 hover:border-blue-400 hover:bg-white hover:shadow-lg transition-all duration-300 cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white shadow-xs">
                  <ShieldCheck className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 group-hover:bg-black group-hover:text-white transition">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-neutral-900 group-hover:text-blue-600 transition">
                ENS Identity Resolution
              </h3>
              <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed">
                Reverse-resolve every minter and owner address on Mainnet, complete with avatars and social records.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-neutral-900">Lookup .eth</span>
              <span className="text-neutral-400 font-mono">Mainnet L1</span>
            </div>
          </div>

          {/* Pillar 3 */}
          <div
            onClick={() => setActiveTab("gallery")}
            className="group relative flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-neutral-50/40 p-5 hover:border-blue-400 hover:bg-white hover:shadow-lg transition-all duration-300 cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 group-hover:bg-blue-600 group-hover:text-white transition">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-neutral-900 group-hover:text-blue-600 transition">
                Chainlink Live Valuation
              </h3>
              <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed">
                Sepolia AggregatorV3 feed refreshes every 15s to compute real-time USD asset value for every NFT.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-blue-700">View Gallery</span>
              <span className="text-neutral-400 font-mono">Sepolia Feed</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pill Navigation Tabs (from _ (4).jpeg & Desain UI) */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full bg-neutral-100/90 p-1.5 border border-neutral-200/80 shadow-xs gap-1">
          <button
            onClick={() => setActiveTab("mint")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "mint"
                ? "bg-black text-white shadow-xs"
                : "text-neutral-600 hover:text-black hover:bg-white/60"
            }`}
          >
            <Paintbrush className="h-3.5 w-3.5" />
            <span>Mint Studio</span>
          </button>

          <button
            onClick={() => setActiveTab("gallery")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "gallery"
                ? "bg-black text-white shadow-xs"
                : "text-neutral-600 hover:text-black hover:bg-white/60"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>NFT Gallery</span>
          </button>

          <button
            onClick={() => setActiveTab("ens")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ens"
                ? "bg-black text-white shadow-xs"
                : "text-neutral-600 hover:text-black hover:bg-white/60"
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>ENS Lookup</span>
          </button>
        </div>
      </div>

      {/* Active Tab View */}
      <section className="space-y-10">
        {activeTab === "mint" && (
          <div className="space-y-10">
            <MintStudio
              onMintSuccess={() => {
                setGalleryRefreshKey((k) => k + 1);
              }}
            />
            <div className="pt-8 border-t border-neutral-200/80">
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
