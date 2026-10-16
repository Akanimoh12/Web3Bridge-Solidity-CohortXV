import Link from "next/link";
import { ConnectButton } from "./ConnectButton";

const links = [
  { href: "/", label: "Home" },
  { href: "/ens", label: "Explore ENS" },
  { href: "/nft", label: "NFT Studio" },
  { href: "/aa", label: "Smart Mint" },
  { href: "/notifications", label: "Activity" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090b11]/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-wrap items-center gap-5">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-white"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white">
              B
            </span>
            BridgeID
          </Link>

          <nav
            aria-label="Main navigation"
            className="flex flex-wrap items-center gap-4 text-sm text-zinc-400"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-white focus-visible:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="max-w-full">
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
