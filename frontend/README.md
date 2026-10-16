# W3B Studio

**Live app:** https://web3-bridge-solidity-cohort-xv.vercel.app. The app is deployed, but uploads require a non-empty server-side `PINATA_JWT` in the Vercel project settings.

W3B Studio lets a visitor connect a wallet, create an NFT, upload its image and metadata to public IPFS through Pinata, and mint it on Sepolia. The collection page loads every token and current owner from the contract, resolves owners to ENS names when available, and shows each creator-provided ETH reference value as a live USD estimate using Chainlink's Sepolia ETH/USD feed. ENS lookups read `.eth` names and public profile records from Ethereum Mainnet.

## Day 4: smart account and live alerts

- Open **Smart account** in the navigation, connect a Sepolia wallet, and mint from the counterfactual smart account. Enable **Mint two in ONE UserOperation** to batch two calls into the same UserOperation. The connected wallet signs the operation; Pimlico's paymaster is asked to sponsor its gas. Sponsorship depends on the Pimlico project/policy and can fall back to the account's EntryPoint deposit.
- Open **Live alerts** and allow browser notifications. It listens for this collection's `Minted` events, displays the recipient's ENS name when one exists (otherwise the shortened address), and shows a browser notification for each mint while the page is open.
- After submitting a successful UserOperation, use the app's Etherscan link to the bundled transaction and add that link here: **Example UserOperation:** _add the Sepolia Etherscan transaction link after sending one_. In the bundled transaction, **From** is the bundler, **To** is the EntryPoint, and **Pimlico's paymaster pays gas** when sponsorship is accepted. The smart account is the sender of the inner calls to ClassNFT.

The alert page only listens while it is open because its event watcher runs in the browser. A real product would run a persistent backend/indexer or managed event listener, store the last processed block, and deliver alerts through push notifications or another durable channel. It would also handle retries and deduplicate events so restarts do not lose or repeat notifications.

## Contracts

- [ClassNFT](https://sepolia.etherscan.io/address/0x089301ED48D1f2532Ddbb06b1069E194009DF052) — ERC-721 collection deployed on Sepolia.
- [Chainlink ETH/USD feed](https://sepolia.etherscan.io/address/0x694AA1769357215DE4FAC081bf1f309aDC325306) — Sepolia price feed.

The NFT's metadata `tokenURI` is an `ipfs://` URI. The image and metadata are fetched back from IPFS for the collection gallery. The ETH reference value is a creator estimate; it is not a sale listing or an oracle appraisal.

The NFT studio also includes seven original SVG art studies as visual inspiration. They are static previews, not minted NFTs. Token #000 is intentionally hidden from the public gallery; it remains on-chain and is not deleted.

## Run locally

Use Node.js 20 or newer:

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:3000. Set public configuration and `PINATA_JWT` in `frontend/.env.local` or Vercel settings before minting. Set `PIMLICO_API_KEY` only in the Vercel project's server-side environment variables; do not put it in a local file or client configuration. The NFT address must be the Sepolia deployment address; wallets need Sepolia ETH for regular mint transactions.

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
- `PIMLICO_API_KEY` (required for smart-account UserOperations; server-side only)

The RPC URLs, NFT address, and IPFS gateway are public client configuration. `PINATA_JWT` and `PIMLICO_API_KEY` are secrets and must be configured only as server-side Vercel environment variables; never use a `NEXT_PUBLIC_` prefix. The browser sends uploads to `/api/upload`, while smart-account requests go through `/api/bundler`; only those server routes attach the respective secrets. If either key started with `NEXT_PUBLIC_`, Next.js would include it in downloadable client code.

## Deploy on Vercel

The Vercel project uses `frontend` as its root directory. Add non-empty `PINATA_JWT` and `PIMLICO_API_KEY` values as server-only environment variables in the project settings; do not prefix them with `NEXT_PUBLIC_`. After changing environment variables, redeploy so the production server receives them. The app uses the deployed Sepolia collection by default, but you can override its address and the public RPC/gateway settings.
