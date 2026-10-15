# W3B Studio

**Live app:** Not deployed yet. Vercel deployment requires project access and the server-side `PINATA_JWT`.

W3B Studio lets a visitor connect a wallet, create an NFT, upload its image and metadata to public IPFS through Pinata, and mint it on Sepolia. The collection page loads every token and current owner from the contract, resolves owners to ENS names when available, and shows each creator-provided ETH reference value as a live USD estimate using Chainlink's Sepolia ETH/USD feed. ENS lookups read `.eth` names and public profile records from Ethereum Mainnet.

## Contracts

- [ClassNFT](https://sepolia.etherscan.io/address/0x089301ED48D1f2532Ddbb06b1069E194009DF052) — ERC-721 collection deployed on Sepolia.
- [Chainlink ETH/USD feed](https://sepolia.etherscan.io/address/0x694AA1769357215DE4FAC081bf1f309aDC325306) — Sepolia price feed.

The NFT's metadata `tokenURI` is an `ipfs://` URI. The image and metadata are fetched back from IPFS for the collection gallery. The ETH reference value is a creator estimate; it is not a sale listing or an oracle appraisal.

## Run locally

Use Node.js 20 or newer:

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:3000. Set the environment variables below in `frontend/.env.local` or the Vercel project's environment settings before minting. The NFT address must be the Sepolia deployment address; wallets need Sepolia ETH for mint transactions.

To deploy the collection yourself from the repository root:

```bash
cd contracts
set -a && . ../.env && set +a
forge script script/DeployClassNFT.s.sol \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  --optimize true --optimizer-runs 200 --evm-version cancun \
  --gas-estimate-multiplier 150
```

The app defaults to the deployed collection above. Set `NEXT_PUBLIC_NFT_ADDRESS` only if you deploy another collection.

## Environment variables

- `PINATA_JWT`
- `NEXT_PUBLIC_SEPOLIA_RPC_URL`
- `NEXT_PUBLIC_MAINNET_RPC_URL`
- `NEXT_PUBLIC_IPFS_GATEWAY`
- `NEXT_PUBLIC_NFT_ADDRESS` (optional collection override)

The RPC URLs, NFT address, and IPFS gateway are public client configuration. The Pinata bearer JWT is secret and must be configured only as a server-side Vercel environment variable. Pinata requires a bearer JWT to accept uploads, so the browser sends files to `/api/upload` and only that server route attaches the secret. If the key started with `NEXT_PUBLIC_`, Next.js would include it in downloadable client code, letting anyone extract it and upload to your Pinata account. The route rejects unsupported files and oversized uploads, and the key is never returned to the browser.

## Deploy on Vercel

Import this repository into Vercel and set the project root directory to `frontend`. Add `PINATA_JWT` as a server-only environment variable; do not prefix it with `NEXT_PUBLIC_`. The app uses the deployed Sepolia collection by default, but you can override its address and the public RPC/gateway settings. Deploy the project, then replace the live-app status at the top with the Vercel URL.
