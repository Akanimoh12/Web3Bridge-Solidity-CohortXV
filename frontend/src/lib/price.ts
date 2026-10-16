"use client";

import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import type { Address } from "viem";

export const ETH_USD_FEED: Address = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

const chainlinkFeedAbi = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

export function useEthUsdPrice() {
  const priceQuery = useReadContract({
    address: ETH_USD_FEED,
    abi: chainlinkFeedAbi,
    functionName: "latestRoundData",
    chainId: sepolia.id,
    query: { refetchInterval: 30_000, staleTime: 20_000, retry: 2 },
  });
  const decimalsQuery = useReadContract({
    address: ETH_USD_FEED,
    abi: chainlinkFeedAbi,
    functionName: "decimals",
    chainId: sepolia.id,
    query: { staleTime: Number.POSITIVE_INFINITY, retry: 2 },
  });
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const answer = priceQuery.data?.[1];
  const updatedAt = priceQuery.data?.[3];
  const decimals = decimalsQuery.data;
  const priceUsd =
    answer !== undefined && answer > 0n && decimals !== undefined
      ? Number(answer) / 10 ** Number(decimals)
      : undefined;
  const updatedAtMs = updatedAt !== undefined ? Number(updatedAt) * 1_000 : undefined;

  return {
    priceUsd,
    updatedAtMs,
    ageSeconds: updatedAtMs !== undefined && now > 0 ? Math.max(0, Math.floor((now - updatedAtMs) / 1_000)) : undefined,
    isLoading: priceQuery.isLoading || decimalsQuery.isLoading,
    error: priceQuery.error ?? decimalsQuery.error,
  };
}

export function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}
