"use client";

import { EnsLookupCard } from "@/components/EnsLookupCard";
import { Sparkles } from "lucide-react";

export default function EnsPage() {
  return (
    <div className="space-y-8 pb-12">
      <div className="pt-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200/60 mb-2">
          <Sparkles className="h-3 w-3 text-blue-600" />
          <span>Ethereum Mainnet L1</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
          ENS Identity Directory
        </h1>
        <p className="text-xs text-neutral-500 mt-1 max-w-xl">
          Resolve any Ethereum Name Service (.eth) address, inspect connected avatars, and read decentralized profile records.
        </p>
      </div>
      <EnsLookupCard />
    </div>
  );
}
