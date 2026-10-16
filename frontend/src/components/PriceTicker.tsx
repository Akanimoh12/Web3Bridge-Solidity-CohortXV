"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useChainlinkPrice } from "@/hooks/useChainlinkPrice";

export function PriceTicker() {
  const [mounted, setMounted] = useState(false);
  const { formattedPrice, timeAgoString, isFetching, refetch } = useChainlinkPrice();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200/90 bg-neutral-50/80 px-3 py-1.5 text-xs text-neutral-800 shadow-xs backdrop-blur-sm transition hover:border-blue-300">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600"></span>
      </span>
      <span className="text-[11px] font-medium text-neutral-500">ETH:</span>
      <span className="font-bold tracking-tight text-neutral-900">{mounted ? formattedPrice : "—"}</span>
      <span className="text-[10px] text-neutral-400 hidden sm:inline">({mounted ? timeAgoString : "—"})</span>
      <button
        type="button"
        onClick={() => refetch()}
        title="Refresh live Sepolia price feed"
        className="ml-0.5 rounded-full p-0.5 text-neutral-400 hover:text-blue-600 transition"
      >
        <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
