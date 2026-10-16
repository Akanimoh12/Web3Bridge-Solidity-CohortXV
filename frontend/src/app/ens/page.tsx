"use client";

import { useState } from "react";
import {
  useEnsAddress,
  useEnsAvatar,
  useEnsName,
  useEnsText,
  useBalance,
} from "wagmi";
import { mainnet } from "wagmi/chains";
import { normalize } from "viem/ens";
import { EthUsdPrice } from "@/components/EthUsdPrice";

function safeNormalize(value: string) {
  try {
    const name = normalize(value.trim());
    return name.endsWith(".eth") ? name : undefined;
  } catch {
    return undefined;
  }
}

export default function EnsPage() {
  const [input, setInput] = useState("vitalik.eth");
  const name = safeNormalize(input);

  const {
    data: resolved,
    isLoading,
    isError,
  } = useEnsAddress({
    name,
    chainId: mainnet.id,
    query: { enabled: Boolean(name) },
  });

  const { data: avatar } = useEnsAvatar({
    name,
    chainId: mainnet.id,
  });

  const { data: description } = useEnsText({
    name,
    key: "description",
    chainId: mainnet.id,
  });

  const { data: twitter } = useEnsText({
    name,
    key: "com.twitter",
    chainId: mainnet.id,
  });

  const { data: primaryName } = useEnsName({
    address: resolved ?? undefined,
    chainId: mainnet.id,
  });

  const { data: balance } = useBalance({
    address: resolved ?? undefined,
    chainId: mainnet.id,
    query: {
      enabled: Boolean(resolved),
      refetchInterval: 30_000,
    },
  });

  const ethBalance = balance
    ? Number(balance.formatted)
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-emerald-400">
          Ethereum Name Service
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">
          Explore Web3 identities
        </h1>
        <p className="mt-2 text-neutral-400">
          Discover an ENS profile, wallet balance,
          and its estimated USD value.
        </p>
      </div>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <label
          htmlFor="ens-search"
          className="mb-2 block text-sm font-medium text-white"
        >
          Search an ENS name
        </label>

        <input
          id="ens-search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="vitalik.eth"
          className="w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-white outline-none focus:border-emerald-400"
        />

        {input && !name && (
          <p className="mt-3 text-sm text-red-400">
            Please enter a valid .eth name.
          </p>
        )}

        {name && isLoading && (
          <p className="mt-3 text-sm text-neutral-400">
            Resolving ENS name...
          </p>
        )}

        {name && isError && (
          <p className="mt-3 text-sm text-red-400">
            ENS lookup failed. Please try again.
          </p>
        )}

        {name && !isLoading && !isError && !resolved && (
          <p className="mt-3 text-sm text-neutral-400">
            No Ethereum address found for this name.
          </p>
        )}
      </section>

      {resolved && (
        <>
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 text-white">
            <div className="flex items-center gap-4">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt={`${name} avatar`}
                  className="h-20 w-20 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-neutral-800 text-3xl">
                  {name?.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <h2 className="break-all text-xl font-semibold">
                  {name}
                </h2>
                <p className="mt-1 text-sm text-neutral-400">
                  {primaryName
                    ? `Primary ENS: ${primaryName}`
                    : "No matching primary ENS name"}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 border-t border-neutral-800 pt-4">
              <p className="break-all text-sm text-neutral-300">
                Address: {resolved}
              </p>

              {description && (
                <p className="text-sm text-neutral-300">
                  {description}
                </p>
              )}

              {twitter && (
                <p className="text-sm text-neutral-300">
                  X: @{twitter}
                </p>
              )}

              <a
                href={`https://etherscan.io/address/${resolved}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-emerald-400 underline"
              >
                View wallet on Etherscan
              </a>
            </div>

            <div className="mt-5 rounded-xl bg-neutral-950 p-4">
              <p className="text-sm text-neutral-400">
                Ethereum Mainnet balance
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {balance
                  ? `${Number(balance.formatted).toFixed(4)} ETH`
                  : "Loading balance..."}
              </p>
            </div>
          </section>

          <EthUsdPrice ethAmount={ethBalance} />

          <p className="text-xs text-neutral-500">
            The balance is read from Ethereum Mainnet.
            The USD estimate uses the Chainlink ETH/USD
            reference feed on Sepolia.
          </p>
        </>
      )}
    </div>
  );
}
