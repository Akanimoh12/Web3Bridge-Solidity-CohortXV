"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useEnsName, useSwitchChain } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { X, Wallet, ChevronRight } from "lucide-react";

export function ConnectButton() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const { data: ensName } = useEnsName({
    address: address,
    chainId: mainnet.id,
    query: { enabled: Boolean(address), retry: false },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-xs opacity-70 cursor-pointer"
      >
        <Wallet className="h-3.5 w-3.5 text-neutral-300" />
        <span>Connect Wallet</span>
        <ChevronRight className="h-3 w-3 text-neutral-400" />
      </button>
    );
  }

  const isWrongChain = isConnected && chainId !== sepolia.id;

  if (isConnected) {
    const displayName = ensName || (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "");

    return (
      <div className="flex items-center gap-2">
        {isWrongChain ? (
          <button
            type="button"
            onClick={() => switchChain({ chainId: sepolia.id })}
            className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 shadow-xs transition"
          >
            Switch to Sepolia
          </button>
        ) : (
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 border border-blue-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
            Sepolia
          </span>
        )}

        <button
          type="button"
          onClick={() => disconnect()}
          title="Click to disconnect"
          className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50 transition shadow-xs group"
        >
          <span className="h-2 w-2 rounded-full bg-blue-600"></span>
          <span className="font-semibold tracking-tight">{displayName}</span>
          <X className="h-3 w-3 text-neutral-400 group-hover:text-neutral-700 transition" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => connect({ connector: connectors[0] })}
      className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-neutral-800 disabled:opacity-50 transition cursor-pointer group"
    >
      <Wallet className="h-3.5 w-3.5 text-neutral-300" />
      <span>{isPending ? "Connecting…" : "Connect Wallet"}</span>
      <ChevronRight className="h-3 w-3 text-neutral-400 group-hover:translate-x-0.5 transition" />
    </button>
  );
}
