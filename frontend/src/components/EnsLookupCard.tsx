"use client";

import { useState } from "react";
import { useAccount, useEnsAddress, useEnsAvatar, useEnsName, useEnsText } from "wagmi";
import { mainnet } from "wagmi/chains";
import { normalize } from "viem/ens";

function safeNormalize(input: string) {
  try {
    const trimmed = input.trim();
    return trimmed ? normalize(trimmed) : undefined;
  } catch {
    return undefined;
  }
}

export function EnsLookupCard() {
  const [input, setInput] = useState("vitalik.eth");
  const normalizedName = safeNormalize(input);
  const { address: connectedAddress } = useAccount();

  // Resolving from Mainnet
  const { data: resolvedAddress, isLoading: isResolvingAddress } = useEnsAddress({
    name: normalizedName,
    chainId: mainnet.id,
    query: { enabled: Boolean(normalizedName), retry: false },
  });

  const { data: avatar } = useEnsAvatar({
    name: normalizedName,
    chainId: mainnet.id,
    query: { enabled: Boolean(normalizedName), retry: false },
  });

  const { data: description } = useEnsText({
    name: normalizedName,
    key: "description",
    chainId: mainnet.id,
    query: { enabled: Boolean(normalizedName), retry: false },
  });

  const { data: twitter } = useEnsText({
    name: normalizedName,
    key: "com.twitter",
    chainId: mainnet.id,
    query: { enabled: Boolean(normalizedName), retry: false },
  });

  const { data: primaryReverseName } = useEnsName({
    address: resolvedAddress ?? undefined,
    chainId: mainnet.id,
    query: { enabled: Boolean(resolvedAddress), retry: false },
  });

  const { data: myConnectedEns } = useEnsName({
    address: connectedAddress,
    chainId: mainnet.id,
    query: { enabled: Boolean(connectedAddress), retry: false },
  });

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
        <div>
          <h2 className="text-lg font-bold text-black flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-600"></span>
            ENS Identity Lookup
          </h2>
          <p className="text-xs text-neutral-500">
            Resolve any <code className="text-blue-600 font-semibold">.eth</code> name on Ethereum mainnet
          </p>
        </div>
        {connectedAddress && (
          <span className="text-xs text-neutral-500 hidden sm:inline-block">
            Your ENS:{" "}
            <strong className="text-blue-600 font-medium">
              {myConnectedEns || "None configured"}
            </strong>
          </span>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. vitalik.eth"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm text-black placeholder-neutral-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition"
            />
          </div>
          {["vitalik.eth", "nick.eth"].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setInput(preset)}
              className="hidden sm:inline-flex items-center rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-700 hover:border-blue-300 hover:text-blue-600 transition"
            >
              {preset}
            </button>
          ))}
        </div>

        {input && !normalizedName && (
          <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
            ⚠️ Invalid ENS name format. Please enter a valid name ending in .eth.
          </div>
        )}

        {isResolvingAddress && (
          <div className="py-4 text-center text-xs text-blue-600 animate-pulse font-medium">
            Resolving on Ethereum mainnet…
          </div>
        )}

        {normalizedName && !isResolvingAddress && !resolvedAddress && (
          <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500 border border-neutral-200">
            No Ethereum address is currently bound to <strong>{input}</strong>.
          </div>
        )}

        {resolvedAddress && (
          <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4 space-y-3 mt-3">
            <div className="flex items-center gap-3">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt={input}
                  className="h-12 w-12 rounded-full border-2 border-blue-500 object-cover shadow-sm"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {normalizedName ? normalizedName[0].toUpperCase() : "Ξ"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-black text-base truncate">{input}</span>
                  {primaryReverseName && primaryReverseName.toLowerCase() === normalizedName?.toLowerCase() && (
                    <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      Verified Primary
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-neutral-600 break-all">{resolvedAddress}</p>
              </div>
            </div>

            {(description || twitter) && (
              <div className="pt-2 border-t border-blue-100/60 text-xs text-neutral-700 space-y-1">
                {description && <p className="italic">“{description}”</p>}
                {twitter && (
                  <p className="flex items-center gap-1 text-blue-600 font-medium">
                    <span>Twitter/X:</span>
                    <a
                      href={`https://x.com/${twitter.replace("@", "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-blue-800"
                    >
                      @{twitter.replace("@", "")}
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
