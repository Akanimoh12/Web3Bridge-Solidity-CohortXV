"use client";

import Link from "next/link";
import { Hexagon } from "lucide-react";
import { ConnectButton } from "./ConnectButton";
import { PriceTicker } from "./PriceTicker";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-sm shadow-sm transition group-hover:bg-blue-700">
            <Hexagon className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-black">
              NFT<span className="text-blue-600">Studio</span>
            </span>
            <span className="text-[10px] font-medium text-neutral-400 -mt-1 hidden sm:block">
              ENS · IPFS · Chainlink
            </span>
          </div>
        </Link>

        <div className="hidden md:flex items-center">
          <PriceTicker />
        </div>

        <div className="flex items-center gap-3">
          <ConnectButton />
        </div>
      </div>

      {/* Mobile price ticker banner */}
      <div className="flex md:hidden justify-center border-t border-neutral-100 bg-neutral-50/50 py-1.5 px-4">
        <PriceTicker />
      </div>
    </header>
  );
}
