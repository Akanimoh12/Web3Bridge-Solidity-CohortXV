"use client";

import { useEnsName } from "wagmi";
import { mainnet } from "wagmi/chains";

type WhoProps = {
  address: `0x${string}`;
};

export function Who({ address }: WhoProps) {
  const { data: ensName } = useEnsName({
    address,
    chainId: mainnet.id,
  });

  const shortAddress =
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <span title={address} className="font-medium text-white">
      {ensName ?? shortAddress}
    </span>
  );
}
