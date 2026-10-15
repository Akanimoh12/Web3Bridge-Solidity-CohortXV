"use client";

import { useAccount, useReadContract } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { sepolia } from "wagmi/chains";
import { CLASS_NFT_ADDRESS, classNftAbi } from "@/lib/contracts";
import { ipfsToHttp } from "@/lib/ipfs";
import { AddressName } from "./AddressName";

type Meta = { name: string; description: string; image: string };

function CardItem({ tokenId, owner }: { tokenId: bigint; owner: `0x${string}` }) {
  const { data: uri } = useReadContract({ address: CLASS_NFT_ADDRESS, abi: classNftAbi, functionName: "tokenURI", args: [tokenId], chainId: sepolia.id });
  const { data: meta, isError } = useQuery({
    queryKey: ["card-meta", uri],
    enabled: !!uri,
    retry: 4,
    queryFn: async (): Promise<Meta> => {
      const response = await fetch(ipfsToHttp(uri as string));
      if (!response.ok) throw new Error("Could not load metadata from IPFS");
      return response.json();
    },
  });

  if (isError) return <p className="text-red-400 text-sm">Card #{tokenId.toString()}: IPFS load failed</p>;
  if (!meta) return <p className="opacity-60 text-sm">Loading card #{tokenId.toString()}...</p>;
  return (
    <div className="rounded-xl border border-white/15 p-4 w-64 flex flex-col gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ipfsToHttp(meta.image)} alt={meta.name} className="h-48 w-full rounded-lg object-cover" />
      <p className="font-semibold">{meta.name}</p>
      <p className="text-sm opacity-80">{meta.description}</p>
      <p className="text-xs opacity-60">Owner: <AddressName address={owner} /></p>
      <p className="text-xs opacity-40 break-all">{uri}</p>
    </div>
  );
}

export function MyCards() {
  const { address } = useAccount();
  const { data: ids } = useReadContract({
    address: CLASS_NFT_ADDRESS,
    abi: classNftAbi,
    functionName: "tokensOf",
    args: address ? [address] : undefined,
    chainId: sepolia.id,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  if (!address) return null;
  if (!ids) return <p className="opacity-60">Loading your cards...</p>;
  if (ids.length === 0) return <p className="opacity-60">No cards yet. Make one above.</p>;
  return <div className="flex flex-wrap gap-4">{ids.map((id) => <CardItem key={id.toString()} tokenId={id} owner={address} />)}</div>;
}