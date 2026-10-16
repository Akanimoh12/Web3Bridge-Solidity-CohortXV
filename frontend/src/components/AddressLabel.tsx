"use client";

import { useEnsName } from "wagmi";
import { mainnet } from "wagmi/chains";
import type { Address } from "viem";

export function AddressLabel({ address }: { address: Address }) {
  const { data: ensName } = useEnsName({ address, chainId: mainnet.id });
  const abbreviated = `${address.slice(0, 6)}…${address.slice(-4)}`;

  return (
    <span title={address} className="address-label">
      {ensName ? <>{ensName} <span className="address-muted">({abbreviated})</span></> : abbreviated}
    </span>
  );
}
