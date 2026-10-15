"use client";

import { useChainlinkPrice } from "@/hooks/useChainlinkPrice";

export function PriceTicker() {
  const { formattedPrice, timeAgoString, isFetching, refetch } = useChainlinkPrice();

  return (
    <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs text-blue-950 shadow-sm backdrop-blur">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600"></span>
      </span>
      <span className="font-medium text-neutral-600">ETH/USD:</span>
      <span className="font-bold text-blue-700">{formattedPrice}</span>
      <span className="text-[11px] text-neutral-500">({timeAgoString})</span>
      <button
        type="button"
        onClick={() => refetch()}
        title="Refresh price feed"
        className={`ml-1 text-blue-600 hover:text-blue-800 transition ${isFetching ? "animate-spin" : ""}`}
      >
        ↻
      </button>
    </div>
  );
}
