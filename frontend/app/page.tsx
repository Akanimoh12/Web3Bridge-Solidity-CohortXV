"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { PriceTicker } from "@/components/PriceTicker";
import { EnsLookup } from "@/components/EnsLookup";
import { AddressName } from "@/components/AddressName";
import { MakeCard } from "@/components/MakeCard";
import { MyCards } from "@/components/MyCards";

export default function Home() {
  const { address } = useAccount();

  return (
    <main className="p-6 flex flex-col gap-6">
      <ConnectButton />
      {address && (
        <p className="text-sm">
          Connected as <AddressName address={address} />
        </p>
      )}
      <PriceTicker />
      <EnsLookup />
      <MakeCard />
      <MyCards />
    </main>
  );
}