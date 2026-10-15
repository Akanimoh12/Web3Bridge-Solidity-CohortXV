"use client";

import { useState } from "react";
import { useEnsAddress, useEnsAvatar, useEnsText } from "wagmi";
import { mainnet } from "wagmi/chains";
import { normalize } from "viem/ens";
import { AddressName } from "./AddressName";

function safeNormalize(input: string) {
  if (!input.includes(".")) return undefined;
  try {
    return normalize(input);
  } catch {
    return undefined; // invalid name, ignore
  }
}

export function EnsLookup() {
  const [input, setInput] = useState("");
  const name = safeNormalize(input.trim());
  const enabled = { enabled: !!name };

  const addr = useEnsAddress({ name, chainId: mainnet.id, query: enabled });
  const avatar = useEnsAvatar({ name, chainId: mainnet.id, query: enabled });
  const bio = useEnsText({ name, key: "description", chainId: mainnet.id, query: enabled });
  const twitter = useEnsText({ name, key: "com.twitter", chainId: mainnet.id, query: enabled });

  return (
    <div className="rounded-xl border border-white/15 p-4 w-full max-w-md flex flex-col gap-3">
      <input
        className="rounded-lg bg-white/10 px-3 py-2 outline-none"
        placeholder="Look up a .eth name, e.g. vitalik.eth"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      {name && addr.isLoading && <p className="opacity-60">Resolving…</p>}
      {name && addr.isSuccess && !addr.data && (
        <p className="text-red-400">No address found for {name}</p>
      )}

      {addr.data && (
        <div className="flex flex-col gap-2">
          {avatar.data && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar.data} alt={name} className="h-20 w-20 rounded-full object-cover" />
          )}
          <p className="font-semibold">{name}</p>
          <p className="text-sm">
            Address: <AddressName address={addr.data} />
          </p>
          <p className="text-xs opacity-50 break-all">{addr.data}</p>
          {bio.data && <p className="text-sm opacity-80">{bio.data}</p>}
          {twitter.data && <p className="text-sm">Twitter: @{twitter.data}</p>}
        </div>
      )}
    </div>
  );
}