"use client";

import { useEnsAvatar, useEnsName } from "wagmi";
import { mainnet } from "wagmi/chains";
import { User } from "lucide-react";

interface EnsAddressProps {
  address?: `0x${string}` | string | null;
  showAvatar?: boolean;
  className?: string;
}

export function EnsAddress({ address, showAvatar = true, className = "" }: EnsAddressProps) {
  const validAddress = address && address.startsWith("0x") && address.length === 42 ? (address as `0x${string}`) : undefined;

  const { data: ensName, isLoading } = useEnsName({
    address: validAddress,
    chainId: mainnet.id,
    query: { retry: false },
  });

  const { data: avatar } = useEnsAvatar({
    name: ensName ?? undefined,
    chainId: mainnet.id,
    query: { enabled: Boolean(ensName), retry: false },
  });

  if (!address) return <span className="text-neutral-400">—</span>;

  const formatted0x = `${address.slice(0, 6)}…${address.slice(-4)}`;

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs ${className}`}>
      {showAvatar && (
        avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="Avatar" className="h-4 w-4 rounded-full border border-blue-200 object-cover" />
        ) : (
          <span className="h-4 w-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
            {ensName ? (
              <span className="text-[9px] font-bold">{ensName[0].toUpperCase()}</span>
            ) : (
              <User className="h-2.5 w-2.5 text-blue-700" />
            )}
          </span>
        )
      )}

      {isLoading ? (
        <span className="text-neutral-400">resolving…</span>
      ) : ensName ? (
        <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
          {ensName}
        </span>
      ) : (
        <span className="text-neutral-800" title={address}>
          {formatted0x}
        </span>
      )}
    </span>
  );
}
