"use client";

import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { formatUnits } from "viem";

const FEED =
  "0x694AA1769357215DE4FAC081bf1f309aDC325306" as const;

const abi = [
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
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

export function EthUsdPrice({
  ethAmount,
}: {
  ethAmount?: number;
}) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => clearInterval(timer);
  }, []);

  const { data: round, isLoading, isError } =
    useReadContract({
      address: FEED,
      abi,
      functionName: "latestRoundData",
      chainId: sepolia.id,
      query: {
        refetchInterval: 30_000,
      },
    });

  const { data: decimals } = useReadContract({
    address: FEED,
    abi,
    functionName: "decimals",
    chainId: sepolia.id,
  });

  const valid =
    round !== undefined &&
    decimals !== undefined &&
    round[1] > 0n &&
    round[3] > 0n;

  const price = valid
    ? Number(formatUnits(round[1], decimals))
    : null;

  const ageSeconds = valid && now
    ? Math.max(
        0,
        Math.floor(now / 1000) - Number(round[3])
      )
    : null;

  const age = ageSeconds === null
    ? "Unknown"
    : ageSeconds < 60
      ? `${ageSeconds} seconds ago`
      : `${Math.floor(ageSeconds / 60)} minutes ago`;

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 text-white">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-neutral-300">
          ETH / USD
        </h2>
        <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs text-emerald-300">
          Chainlink · Sepolia
        </span>
      </div>

      {price !== null ? (
        <>
          <p className="text-3xl font-semibold">
            ${price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>

          <p className="mt-2 text-xs text-neutral-400">
            Oracle updated {age}
          </p>

          {ageSeconds !== null &&
            ageSeconds > 86400 && (
              <p className="mt-2 text-sm text-amber-300">
                Warning: oracle data is over 24 hours old.
              </p>
            )}

          {ethAmount !== undefined && (
            <p className="mt-4 border-t border-neutral-700 pt-3 text-sm text-neutral-300">
              {ethAmount.toFixed(4)} ETH ≈ $
              {(ethAmount * price).toLocaleString(
                "en-US",
                { maximumFractionDigits: 2 }
              )}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-neutral-400">
          {isLoading
            ? "Loading Chainlink price..."
            : isError
              ? "Unable to read the price feed."
              : "Price unavailable."}
        </p>
      )}

      <p className="mt-3 text-xs text-neutral-500">
        Automatically checks for updates every 30 seconds.
      </p>
    </section>
  );
}
