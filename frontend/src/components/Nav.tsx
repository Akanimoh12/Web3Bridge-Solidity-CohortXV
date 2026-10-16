"use client";

import Link from "next/link";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { ConnectButton } from "./ConnectButton";
import { PriceTicker } from "./PriceTicker";
import { NFT_ADDRESS } from "@/contracts/nft";

export function Nav() {
  return (
    <header className="sticky top-3 z-50 px-3 sm:px-6 mb-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full border border-neutral-200/80 bg-white/85 px-4 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md transition">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white transition group-hover:bg-blue-600">
            <Sparkles className="h-4 w-4 text-blue-400 group-hover:text-white transition" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-extrabold tracking-tight text-neutral-900">
              NFT<span className="text-blue-600">Studio</span>
            </span>
            <span className="hidden md:inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200/60">
              v2.0
            </span>
          </div>
        </Link>

        {/* Center Pill Nav Links */}
        <nav className="hidden md:flex items-center gap-1 rounded-full bg-neutral-100/70 p-1 border border-neutral-200/50">
          <Link
            href="/"
            className="rounded-full px-3.5 py-1 text-xs font-semibold text-neutral-700 hover:text-black hover:bg-white transition"
          >
            Studio
          </Link>
          <Link
            href="/nft"
            className="rounded-full px-3.5 py-1 text-xs font-semibold text-neutral-700 hover:text-black hover:bg-white transition"
          >
            Mint
          </Link>
          <Link
            href="/ens"
            className="rounded-full px-3.5 py-1 text-xs font-semibold text-neutral-700 hover:text-black hover:bg-white transition"
          >
            ENS Lookup
          </Link>
          <a
            href={`https://sepolia.etherscan.io/address/${NFT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-0.5 rounded-full px-3 py-1 text-xs font-medium text-neutral-500 hover:text-blue-600 transition"
          >
            <span>Contract</span>
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </nav>

        {/* Right side: Live Ticker & Connect */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:block">
            <PriceTicker />
          </div>
          <ConnectButton />
        </div>
      </div>

      {/* Mobile price ticker strip */}
      <div className="flex lg:hidden justify-center pt-2">
        <PriceTicker />
      </div>
    </header>
  );
}
