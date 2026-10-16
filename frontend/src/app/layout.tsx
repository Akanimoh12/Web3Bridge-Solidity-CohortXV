import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./Providers";
import { Nav } from "../components/Nav";
import { NFT_ADDRESS } from "@/contracts/nft";
import { Sparkles, ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "NFT Studio — ENS, IPFS & Chainlink dApp",
  description: "Web3Bridge Day 3 dApp featuring ENS identity resolution, Pinata IPFS decentralized storage, and live Chainlink price feeds on Sepolia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[#FAFAFA] text-neutral-900 antialiased selection:bg-blue-100 selection:text-blue-900"
        suppressHydrationWarning
      >
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Nav />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 sm:px-6">
              {children}
            </main>
            
            {/* Minimal High-End Footer inspired by Desain UI */}
            <footer className="mt-16 border-t border-neutral-200/80 bg-white py-8 text-neutral-600">
              <div className="mx-auto max-w-5xl px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-white">
                      <Sparkles className="h-3 w-3 text-blue-400" />
                    </div>
                    <span className="font-bold tracking-tight text-neutral-900">
                      NFT<span className="text-blue-600">Studio</span>
                    </span>
                    <span className="text-neutral-400">·</span>
                    <span className="text-neutral-500">Web3Bridge Solidity Cohort XV</span>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap justify-center">
                    <a
                      href={`https://sepolia.etherscan.io/address/${NFT_ADDRESS}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 font-medium text-neutral-700 hover:border-blue-300 hover:text-blue-600 transition"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                      <span>Contract: {NFT_ADDRESS.slice(0, 6)}…{NFT_ADDRESS.slice(-4)}</span>
                      <ArrowUpRight className="h-3 w-3 text-neutral-400" />
                    </a>
                    <span className="text-neutral-400 hidden sm:inline">|</span>
                    <span className="text-[11px] text-neutral-400">
                      Archived & Verified · 2026
                    </span>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
