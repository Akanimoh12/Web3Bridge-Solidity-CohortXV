import Link from "next/link";
import { EthUsdPrice } from "@/components/EthUsdPrice";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        BridgeID - Web3 Identity
      </h1>

      <p>
        Explore ENS identities, create NFTs using IPFS,
        and track the live ETH price with Chainlink.
      </p>

      {/* Live Chainlink ETH/USD price */}
      <EthUsdPrice />

      <div className="flex gap-4">
        <Link href="/ens" className="underline">
          Explore ENS
        </Link>

        <Link href="/nft" className="underline">
          Create NFT
        </Link>
      </div>
    </div>
  );
}
