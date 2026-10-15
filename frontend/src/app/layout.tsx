import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./Providers";
import { Nav } from "../components/Nav";

export const metadata: Metadata = {
  title: "W3B Studio — onchain art, made yours",
  description: "Create an NFT with an IPFS-hosted image, ENS identity, and live Chainlink ETH pricing.",
};

// Every page of the app is drawn inside this layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Nav />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
