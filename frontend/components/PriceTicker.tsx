"use client";

import { useEffect, useState } from "react";
import { useEthPrice } from "@/hooks/useEthPrice";

export function PriceTicker() {
  const { price, updatedAt, checkedAt, isError } = useEthPrice();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (isError) return <p className="text-red-400">Price unavailable</p>;
  if (price === null || updatedAt === null || now === null)
    return <p className="opacity-60">Loading ETH price…</p>;

  const feedAge = Math.max(0, Math.floor(now / 1000) - updatedAt);
  const checkedAgo = checkedAt ? Math.max(0, Math.floor((now - checkedAt) / 1000)) : 0;

  return (
    <div className="rounded-xl border border-white/15 p-4 w-fit">
      <p className="text-sm opacity-60">ETH / USD (Chainlink, Sepolia)</p>
      <p className="text-3xl font-semibold">
        ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <p className="text-sm opacity-60">Feed updated {feedAge}s ago</p>
      <p className="text-xs opacity-40">Page checked {checkedAgo}s ago</p>
    </div>
  );
}