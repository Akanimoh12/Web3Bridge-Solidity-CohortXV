"use client";

import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { CHAINLINK_ETH_USD_ADDRESS, chainlinkAggregatorAbi } from "@/contracts/chainlink";

export function useChainlinkPrice() {
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  // Read latest round data from Chainlink on Sepolia, auto-refreshed every 15 seconds
  const { data: roundData, refetch, isFetching, isLoading, error } = useReadContract({
    address: CHAINLINK_ETH_USD_ADDRESS,
    abi: chainlinkAggregatorAbi,
    functionName: "latestRoundData",
    chainId: sepolia.id,
    query: {
      refetchInterval: 15_000,
      retry: true,
    },
  });

  const { data: decimals = 8 } = useReadContract({
    address: CHAINLINK_ETH_USD_ADDRESS,
    abi: chainlinkAggregatorAbi,
    functionName: "decimals",
    chainId: sepolia.id,
  });

  const answer = roundData?.[1];
  const updatedAtTimestamp = roundData?.[3] ? Number(roundData[3]) : null;

  const price = answer !== undefined ? Number(answer) / 10 ** Number(decimals) : null;

  // Track relative time since last feed update
  useEffect(() => {
    if (!updatedAtTimestamp) return;

    const updateAgo = () => {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const diff = Math.max(0, nowInSeconds - updatedAtTimestamp);
      setSecondsAgo(diff);
    };

    updateAgo();
    const interval = setInterval(updateAgo, 1000);
    return () => clearInterval(interval);
  }, [updatedAtTimestamp]);

  const formattedPrice = price
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price)
    : "—";

  const timeAgoString =
    secondsAgo === null
      ? "—"
      : secondsAgo < 60
      ? `${secondsAgo}s ago`
      : `${Math.floor(secondsAgo / 60)}m ${secondsAgo % 60}s ago`;

  return {
    price,
    formattedPrice,
    updatedAt: updatedAtTimestamp ? new Date(updatedAtTimestamp * 1000) : null,
    secondsAgo,
    timeAgoString,
    isFetching,
    isLoading,
    error,
    refetch,
  };
}
