import { http, createConfig, injected } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

// App configuration supporting Sepolia (NFT & Chainlink) and Mainnet (ENS resolution)
export const config = createConfig({
  chains: [sepolia, mainnet],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"),
    [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://cloudflare-eth.com"),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
