"use client";

import { useState } from "react";
import { useAccount, useEnsAddress, useEnsAvatar, useEnsName, useEnsText } from "wagmi";
import { mainnet } from "wagmi/chains";
import { normalize } from "viem/ens";
import { AlertCircle, CheckCircle2, ArrowUpRight, AtSign, Search, Sparkles } from "lucide-react";

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
    <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-[0_4px_25px_rgb(0,0,0,0.03)]">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-100 gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 mb-1.5 border border-blue-200/60">
            <Sparkles className="h-3 w-3" />
            <span>Ethereum Mainnet L1</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900">
            ENS Identity Resolver
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Resolve human-readable <code className="text-blue-600 font-bold">.eth</code> names, avatars, and text records.
          </p>
        </div>

        {connectedAddress && (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 self-start sm:self-auto text-xs">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Your Connected ENS:</span>
            <strong className="text-blue-700 font-semibold">{myConnectedEns || "No primary ENS set"}</strong>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {/* Search input with preset chips */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. vitalik.eth"
              className="w-full rounded-full border border-neutral-200/90 bg-neutral-50/40 pl-11 pr-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-blue-600 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>
          <div className="flex gap-1.5 items-center">
            {["vitalik.eth", "nick.eth", "ethereum.eth"].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setInput(preset)}
                className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:border-blue-400 hover:text-blue-600 hover:bg-white transition cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {input && !normalizedName && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-red-50 p-3.5 text-xs text-red-600 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>Invalid ENS name format. Please enter a valid name ending in .eth.</span>
          </div>
        )}

        {isResolvingAddress && (
          <div className="py-6 text-center text-xs text-blue-600 animate-pulse font-semibold">
            Querying Ethereum Mainnet ENS Registry…
          </div>
        )}

        {normalizedName && !isResolvingAddress && !resolvedAddress && (
          <div className="rounded-2xl bg-neutral-50 p-4 text-xs text-neutral-500 border border-neutral-200">
            No Ethereum address is currently bound to <strong>{input}</strong>.
          </div>
        )}

        {resolvedAddress && (
          <div className="rounded-3xl border border-blue-200/80 bg-blue-50/40 p-6 space-y-4 mt-4">
            <div className="flex items-center gap-4">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt={input}
                  className="h-14 w-14 rounded-full border-2 border-blue-500 object-cover shadow-xs bg-white"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-black text-white flex items-center justify-center font-extrabold text-xl shadow-xs">
                  {normalizedName ? normalizedName[0].toUpperCase() : "Ξ"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-neutral-900 text-lg tracking-tight truncate">
                    {input}
                  </span>
                  {primaryReverseName &&
                    primaryReverseName.toLowerCase() === normalizedName?.toLowerCase() && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Verified Primary</span>
                      </span>
                    )}
                </div>
                <p className="text-xs font-mono text-neutral-600 break-all mt-0.5">{resolvedAddress}</p>
              </div>
            </div>

            {(description || twitter) && (
              <div className="pt-3 border-t border-blue-100/70 text-xs text-neutral-700 space-y-2">
                {description && (
                  <p className="italic text-neutral-600 bg-white/70 p-3 rounded-2xl border border-blue-100">
                    “{description}”
                  </p>
                )}
                {twitter && (
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500 text-[11px]">X/Twitter:</span>
                    <a
                      href={`https://x.com/${twitter.replace("@", "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-semibold text-blue-600 border border-blue-200 hover:border-blue-400 transition"
                    >
                      <AtSign className="h-3 w-3" />
                      <span>{twitter.replace("@", "")}</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
