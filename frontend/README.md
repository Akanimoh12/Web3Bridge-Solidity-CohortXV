# BridgeID

BridgeID is a Web3 identity dApp built for Web3Bridge Solidity Cohort XV, Day 3.

Users can explore ENS profiles, view Ethereum wallet balances in USD using a Chainlink price feed, and mint NFTs with images and metadata stored on IPFS through Pinata.

## Live application

Vercel: Add the production URL after deployment.

## Features

- ENS name resolution, avatars and profile records
- Ethereum Mainnet wallet balances
- Chainlink ETH/USD price from Sepolia, with automatic refresh and update age
- Wallet connection and NFT minting on Sepolia
- Server-side Pinata uploads
- NFT metadata and image retrieval from IPFS

## Contracts

ClassNFT on Ethereum Sepolia:
https://sepolia.etherscan.io/address/0xCcBb310c30Df589c519F6e22c5ac7C3a45F607A1

Chainlink ETH/USD feed on Sepolia:
https://sepolia.etherscan.io/address/0x694AA1769357215DE4FAC081bf1f309aDC325306

## Run locally

From the frontend directory:

1. Run `npm ci`.
2. Create `.env.local` and configure the environment variables listed below.
3. Run `npm run dev`.
4. Open http://localhost:3000.

## Environment variables

- NEXT_PUBLIC_SEPOLIA_RPC_URL
- NEXT_PUBLIC_MAINNET_RPC_URL
- NEXT_PUBLIC_NFT_ADDRESS
- PINATA_JWT

Never commit actual environment variable values.

## Why the Pinata key stays on the server

The Pinata JWT is kept in a server route because it grants permission to upload files to our Pinata account. The browser sends files to our API, and the server authenticates with Pinata using the secret key. If the key started with NEXT_PUBLIC_, Next.js could expose it in the browser's JavaScript bundle. Someone could then copy it and abuse our Pinata storage or API permissions.

## Security

The upload API validates file types, image signatures and upload sizes. Production deployments also require abuse protection and rate limiting.

## Network information

ENS and wallet balance reads use Ethereum Mainnet.
NFT minting and the Chainlink reference feed use Ethereum Sepolia.
Sepolia ETH is test ETH and has no real monetary value.
