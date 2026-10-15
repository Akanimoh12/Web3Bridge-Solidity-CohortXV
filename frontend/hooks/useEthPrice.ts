"use client";

import { useReadContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { ETH_USD_FEED, feedAbi } from "@/lib/contracts";

export function useEthPrice() {
  const round = useReadContract({
    address: ETH_USD_FEED,
    abi: feedAbi,
    functionName: "latestRoundData",
    chainId: sepolia.id,
    query: { refetchInterval: 15_000 }, // re-reads the feed every 15 seconds
  });

  const dec = useReadContract({
    address: ETH_USD_FEED,
    abi: feedAbi,
    functionName: "decimals",
    chainId: sepolia.id,
  });

  if (!round.data || dec.data === undefined) {
    return { price: null, updatedAt: null, checkedAt: null, isError: round.isError };
  }

  const [, answer, , updatedAt] = round.data;
  return {
    price: Number(answer) / 10 ** dec.data,
    updatedAt: Number(updatedAt), // when Chainlink last updated the feed (unix seconds)
    checkedAt: round.dataUpdatedAt, // when your page last read it (ms)
    isError: round.isError,
  };
}