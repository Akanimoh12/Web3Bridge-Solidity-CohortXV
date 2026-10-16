
import Link from "next/link";
import { EthUsdPrice } from "@/components/EthUsdPrice";

const features = [
  {
    number: "01",
    title: "Discover ENS identities",
    description:
      "Look up an Ethereum name, see its avatar, public profile records, wallet balance and USD estimate.",
    href: "/ens",
    action: "Explore identities",
  },
  {
    number: "02",
    title: "Create your NFT",
    description:
      "Upload your picture to IPFS through Pinata and mint a personal NFT on Ethereum Sepolia.",
    href: "/nft",
    action: "Open NFT studio",
  },
];

export default function Home() {
  return (
    <div className="space-y-16 pb-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#101523] px-6 py-12 sm:px-10 sm:py-16 lg:px-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 right-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"
        />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-xs font-medium tracking-wide text-violet-300">
              ENS · IPFS · CHAINLINK
            </div>

            <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Your identity,
              <span className="block bg-gradient-to-r from-violet-400 to-emerald-300 bg-clip-text text-transparent">
                onchain.
              </span>
            </h1>

            <p className="max-w-xl text-base leading-7 text-zinc-400">
              Discover Ethereum identities, explore ENS profiles,
              and create a unique NFT backed by IPFS.
              Everything connected in one Web3 experience.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/ens"
                className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                Explore ENS
              </Link>

              <Link
                href="/nft"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Create NFT
              </Link>
            </div>

            <p className="text-xs text-zinc-500">
              NFT transactions use Ethereum Sepolia test ETH.
            </p>
          </div>

          <div className="relative space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-300">
                  Ethereum market reference
                </p>

                <span className="text-xs text-zinc-500">
                  Chainlink
                </span>
              </div>

              <EthUsdPrice />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-violet-300">
                  ENS
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  Human-readable identities
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-emerald-300">
                  IPFS
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  Content-addressed files
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="space-y-7">
        <div className="space-y-3">
          <p className="text-sm font-medium text-violet-400">
            BUILT FOR WEB3
          </p>

          <h2 className="text-3xl font-bold tracking-tight text-white">
            Everything starts with your identity
          </h2>

          <p className="max-w-2xl text-zinc-400">
            BridgeID combines decentralized names,
            IPFS-backed digital assets, and onchain price data.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {features.map((feature) => (
            <Link
              key={feature.number}
              href={feature.href}
              className="group rounded-2xl border border-white/10 bg-[#131821] p-7 transition hover:border-violet-400/40 hover:bg-[#191e2a]"
            >
              <p className="text-sm font-medium text-violet-400">
                {feature.number}
              </p>

              <h3 className="mt-5 text-xl font-semibold text-white">
                {feature.title}
              </h3>

              <p className="mt-3 min-h-20 text-sm leading-7 text-zinc-400">
                {feature.description}
              </p>

              <p className="mt-6 text-sm font-semibold text-violet-300 transition group-hover:text-violet-200">
                {feature.action} →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="rounded-3xl border border-white/10 bg-[#111620] p-6 sm:p-9">
        <div className="space-y-3">
          <p className="text-sm font-medium text-emerald-400">
            HOW IT WORKS
          </p>

          <h2 className="text-2xl font-semibold text-white">
            Three technologies, one experience
          </h2>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-violet-300">
              01 / ENS
            </p>

            <h3 className="mt-2 font-medium text-white">
              Discover an identity
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Resolve an Ethereum name into its address
              and available profile records.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-violet-300">
              02 / IPFS
            </p>

            <h3 className="mt-2 font-medium text-white">
              Upload your artwork
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Store an image and its NFT metadata
              on public IPFS through Pinata.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-violet-300">
              03 / CHAINLINK
            </p>

            <h3 className="mt-2 font-medium text-white">
              View the ETH price
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Read the Sepolia ETH/USD oracle feed
              and see when its price was updated.
            </p>
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <section className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-7 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Ready to create your Web3 identity?
          </h2>

          <p className="mt-2 text-sm text-zinc-400">
            Connect your wallet and mint your first BridgeID NFT.
          </p>
        </div>

        <Link
          href="/nft"
          className="shrink-0 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          Open NFT Studio
        </Link>
      </section>
    </div>
  );
}
