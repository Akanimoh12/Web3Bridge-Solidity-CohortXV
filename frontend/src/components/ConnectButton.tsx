"use client";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useEnsName,
} from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

export function ConnectButton() {
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } =
    useSwitchChain();

  const { data: ensName } = useEnsName({
    address,
    chainId: mainnet.id,
    query: { enabled: !!address },
  });

  if (isConnected && address) {
    const wrongNetwork = chain?.id !== sepolia.id;

    return (
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-2 text-xs font-semibold ${
            wrongNetwork
              ? "bg-amber-100 text-amber-900"
              : "bg-emerald-100 text-emerald-900"
          }`}
        >
          {chain?.name ?? "Unknown network"}
        </span>

        <span className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-medium text-white">
          {ensName ??
            `${address.slice(0, 6)}...${address.slice(-4)}`}
        </span>

        {wrongNetwork && (
          <button
            onClick={() => switchChain({ chainId: sepolia.id })}
            disabled={isSwitching}
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
          >
            {isSwitching ? "Switching..." : "Switch to Sepolia"}
          </button>
        )}

        <button
          onClick={() => disconnect()}
          className="rounded-lg border border-neutral-600 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      disabled={isPending || connectors.length === 0}
      onClick={() => connect({ connector: connectors[0] })}
      className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-neutral-200 disabled:opacity-50"
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}