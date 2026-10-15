
import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./Providers";
import { Nav } from "../components/Nav";

export const metadata: Metadata = {
  title: "BridgeID | Your Identity, Onchain",
  description:
    "Explore ENS profiles, mint NFTs stored on IPFS, and view live ETH prices through Chainlink.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#090b11] text-zinc-100 antialiased">
        <Providers>
          <Nav />

          <main className="mx-auto min-h-[75vh] w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>

          <footer className="border-t border-white/10 px-4 py-7">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
              <p>BridgeID · Web3Bridge Cohort XV</p>
              <p>ENS · IPFS · Chainlink · Sepolia</p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
