"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { AddressLabel } from "./AddressLabel";

export function ConnectButton() {
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="wallet-connected">
        <span className="wallet-chain">{chain?.name ?? "Unknown network"}</span>
        <AddressLabel address={address} />
        <button className="text-button" onClick={() => disconnect()}>Disconnect</button>
      </div>
    );
  }

  return (
    <div className="connect-options">
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          className="button button-dark button-small"
          disabled={isPending}
          onClick={() => connect({ connector })}
        >
          {isPending ? "Connecting…" : `Connect ${connector.name}`}
        </button>
      ))}
    </div>
  );
}
