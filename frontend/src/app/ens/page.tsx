"use client";

import { useState } from "react";
import { useEnsAddress, useEnsAvatar, useEnsName, useEnsText } from "wagmi";
import { mainnet } from "wagmi/chains";
import { normalize } from "viem/ens";
import { AddressLabel } from "@/components/AddressLabel";

function normalizedEthName(input: string) {
  const trimmed = input.trim();
  if (!trimmed.toLowerCase().endsWith(".eth")) return undefined;
  try {
    return normalize(trimmed);
  } catch {
    return undefined;
  }
}

export default function EnsPage() {
  const [input, setInput] = useState("");
  const name = normalizedEthName(input);
  const { data: resolved, isLoading, error } = useEnsAddress({ name, chainId: mainnet.id });
  const { data: avatar } = useEnsAvatar({ name, chainId: mainnet.id });
  const { data: description } = useEnsText({ name, key: "description", chainId: mainnet.id });
  const { data: twitter } = useEnsText({ name, key: "com.twitter", chainId: mainnet.id });
  const { data: primaryName } = useEnsName({
    address: resolved ?? undefined,
    chainId: mainnet.id,
    query: { enabled: Boolean(resolved) },
  });

  return (
    <div className="shell page-shell">
      <div className="page-intro">
        <p className="eyebrow"><span className="eyebrow-line" />THE NAME LAYER</p>
        <h1>Every wallet has<br /><span>a story.</span></h1>
        <p>Look up an ENS name to see the address, profile avatar, and public records it points to.</p>
      </div>

      <section className="panel ens-panel">
        <label className="field-label" htmlFor="ens-name">ENS name</label>
        <div className="search-row">
          <input
            id="ens-name"
            className="text-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="vitalik.eth"
            autoComplete="off"
          />
          <span className="input-suffix">.eth</span>
        </div>
        {input.trim() && !name && <p className="form-message error-message">Enter a valid .eth name.</p>}
        {name && isLoading && <p className="form-message">Resolving on Ethereum Mainnet…</p>}
        {name && error && <p className="form-message error-message">ENS lookup failed. Check your connection and try again.</p>}
        {name && !isLoading && !error && !resolved && <p className="form-message">No address is currently set for {name}.</p>}

        {resolved && (
          <div className="ens-result">
            <div className="ens-avatar">
              {avatar ? (
                // ENS avatars can be IPFS URIs as well as ordinary image URLs.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar.startsWith("ipfs://") ? `https://gateway.pinata.cloud/ipfs/${avatar.slice(7).replace(/^ipfs\//, "")}` : avatar}
                  alt={`${name} avatar`}
                />
              ) : (
                <span>{name?.slice(0, 1).toUpperCase() ?? "?"}</span>
              )}
            </div>
            <div className="ens-result-content">
              <p className="result-name">{name}</p>
              <p className="result-address"><AddressLabel address={resolved} /> · {resolved}</p>
              <p className="result-primary">Primary name: <strong>{primaryName ?? "Not set"}</strong></p>
              {description && <p className="ens-record">{description}</p>}
              {twitter && <p className="ens-record">𝕏 <a href={`https://x.com/${encodeURIComponent(twitter)}`} target="_blank" rel="noreferrer">@{twitter}</a></p>}
            </div>
          </div>
        )}
      </section>
      <p className="page-footnote">ENS records are read from Ethereum Mainnet. Lookup is free and never asks for a signature.</p>
    </div>
  );
}
