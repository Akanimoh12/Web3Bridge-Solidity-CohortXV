# BridgeID

BridgeID is a Web3 identity dApp built for Web3Bridge Solidity Cohort XV, Day 3.

Users can explore ENS profiles, view Ethereum wallet balances in USD using a Chainlink price feed, and mint NFTs with images and metadata stored on IPFS through Pinata.

## Live application

Vercel: https://bridgeid-web3bridge.vercel.app/

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

## Day 4: Account Abstraction and Live Activity

BridgeID now supports ERC-4337 smart account NFT minting and live blockchain event notifications.

### Smart Account and Batching

Users can connect MetaMask, calculate their counterfactual smart account address, and execute two ClassNFT mint calls in one UserOperation.

The integration uses permissionless.js, Pimlico, ERC-4337 EntryPoint v0.7, and Sepolia.

### Verified UserOperation

UserOperation hash:
0xd129241a56111ec98a0d77b712809ed524732f52bc45b12fe17cb979d9504de8

Successful transaction:
https://sepolia.etherscan.io/tx/0x0db40a8601e1f8f3ebfe5604a5d3e883c38bc3faf31bb7410da4da00ae1dedea

Results:
- One successful UserOperation
- Two ClassNFT mint calls
- Minted token IDs: 2 and 3
- Smart account: 0x64e79E075D149658f0E810E04496ac99B19e8637
- Paymaster: 0x7777777777777aEc03fd955926DbF81597e66834C

### Who Sent the Transaction and Paid Gas?

The transaction's From address is the bundler's transaction-sending account:
0x4337005db25DbAD41Da5692ba1188751eE5D98b6

The To address is the ERC-4337 EntryPoint:
0x0000000071727De22E5E9d8BAf0edAc6f37da032

The UserOperation sender is the smart account. The bundler submits the Ethereum transaction, while the paymaster sponsors the UserOperation's gas. The successful receipt confirms a nonzero paymaster.

### Live Activity

The Activity page watches ClassNFT Minted events, displays recipient ENS names when available, and shows browser notifications for new events.

The page also retrieves previous events from Sepolia so users can view NFT minting history after refreshing or reopening the application.

### What Happens When the Page Is Closed?

Browser notifications work only while the Live Activity page is open and its listener is running. The blockchain retains previous events, which the app can retrieve when reopened. A production application would use a persistent backend listener and event database, with services such as Push Protocol or Telegram to deliver notifications when users are offline.

### Day 4 Environment Variables

- PIMLICO_API_KEY (server-side secret)
- PIMLICO_ALLOW_WRITES (server-side execution switch)

The Pimlico API key must never be exposed through NEXT_PUBLIC_ environment variables.

Production sponsorship requires a restricted paymaster policy and appropriate API abuse protection.
