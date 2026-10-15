import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./Providers";
import { Nav } from "../components/Nav";

export const metadata: Metadata = {
  title: "NFT Studio — ENS, IPFS & Chainlink dApp",
  description: "Web3Bridge Day 3 dApp featuring ENS identity resolution, Pinata IPFS decentralized storage, and live Chainlink price feeds on Sepolia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black antialiased selection:bg-blue-100 selection:text-blue-900">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Nav />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
              {children}
            </main>
            <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
              <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                <span>Web3Bridge Solidity Cohort XV · Day 3 Assignment</span>
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-600"></span>
                  Ethereum Sepolia & Mainnet ENS
                </span>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
