"use client";

import { formatAge, useEthUsdPrice } from "@/lib/price";

export function PriceTicker() {
  const { priceUsd, ageSeconds, isLoading, error } = useEthUsdPrice();

  return (
    <div className="price-pill" aria-live="polite">
      <span className="price-dot" />
      <span>
        ETH{" "}
        {priceUsd !== undefined
          ? `$${priceUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : isLoading
            ? "loading"
            : "unavailable"}
      </span>
      <span className="price-age">
        {ageSeconds !== undefined ? formatAge(ageSeconds) : error ? "Chainlink feed unavailable" : "—"}
      </span>
    </div>
  );
}
