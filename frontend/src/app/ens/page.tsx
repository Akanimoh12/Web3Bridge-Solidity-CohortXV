"use client";

import { EnsLookupCard } from "@/components/EnsLookupCard";

export default function EnsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-black">ENS Identity Resolver</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Look up any Ethereum Name Service (.eth) address, avatar, and metadata records
        </p>
      </div>
      <EnsLookupCard />
    </div>
  );
}
