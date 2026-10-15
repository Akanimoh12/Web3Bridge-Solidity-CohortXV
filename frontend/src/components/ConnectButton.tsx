"use client";

import { useAccount, useConnect, useDisconnect, useEnsName, useSwitchChain } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const { data: ensName } = useEnsName({
    address: address,
    chainId: mainnet.id,
    query: { enabled: Boolean(address), retry: false },
  });

  const isWrongChain = isConnected && chainId !== sepolia.id;

  if (isConnected) {
    const displayName = ensName || (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "");

    return (
      <div className="flex items-center gap-2">
        {isWrongChain ? (
          <button
            type="button"
            onClick={() => switchChain({ chainId: sepolia.id })}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 shadow-sm transition"
          >
            Switch to Sepolia
          </button>
        ) : (
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
            Sepolia
          </span>
        )}

        <button
          type="button"
          onClick={() => disconnect()}
          title="Click to disconnect"
          className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:border-black hover:bg-neutral-50 transition shadow-sm"
        >
          <span className="h-2 w-2 rounded-full bg-blue-600"></span>
          <span>{displayName}</span>
          <span className="text-[10px] text-neutral-400 font-normal ml-0.5">✕</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => connect({ connector: connectors[0] })}
      className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 transition"
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
