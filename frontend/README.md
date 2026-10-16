# NFT Studio — Web3Bridge Day 3 dApp

An end-to-end decentralized application combining **ENS identity resolution**, **decentralized IPFS file pinning via Pinata**, and **real-time Chainlink price oracles** on Ethereum Sepolia.

---

## 🚀 Live Demo

- **Vercel Deployment:** [https://web3-bridge-solidity-cohort-xv.vercel.app](https://web3-bridge-solidity-cohort-xv.vercel.app) *(or your deployed Vercel URL)*
- **Mobile Friendly:** Fully responsive and tested on iOS / Android mobile browsers.

---

## 💡 What It Does

1. **Decentralized NFT Minting (IPFS & Pinata):**
   - Upload any image file with custom title and metadata.
   - The file is securely pinned to IPFS through a server-side Next.js API route (`/api/upload`) using Pinata's Files API v3.
   - Mints an on-chain ERC-721 token pointing to `ipfs://<metadata_cid>` on Ethereum Sepolia.
   - Displays the minted NFT back directly from the decentralized IPFS network.

2. **ENS Identity Resolution:**
   - **Interactive Resolver:** Type any `.eth` name (e.g. `vitalik.eth`) to resolve its Ethereum address, avatar image, bio description, and Twitter/X handle.
   - **Universal Reverse Resolution:** Every address displayed in the dApp (connected wallet, NFT creator, token owners in the gallery) automatically resolves to its primary ENS name on Ethereum mainnet.

3. **Live Chainlink Price Feed:**
   - Continuously reads the live ETH / USD price from the Chainlink Aggregator on Sepolia (`0x694AA1769357215DE4FAC081bf1f309aDC325306`).
   - Automatically polls and updates every 15 seconds with relative age indication ("Updated Xs ago").
   - Computes real-time USD asset and mint valuations dynamically across the app.

4. **Community NFT Gallery & Inspector:**
   - Lists all minted NFTs in reverse chronological order with image, token ID, metadata, owner ENS name, and USD value at current ETH prices.
   - Includes a direct Token ID inspector for quick lookup.

5. **ERC-4337 Account Abstraction (Gasless Batch Minting):**
   - Connect any standard EOA wallet; the dApp automatically derives a deterministic **SimpleSmartAccount** (ERC-4337) on Sepolia via EntryPoint `v0.7`.
   - Bundles multiple mint transactions into a **single atomic UserOperation**.
   - Fully sponsored by **Pimlico Verifying Paymaster** via a secure server route (`/api/pimlico`), meaning users pay **0 gas** and sign once.

6. **Real-Time Mint Alerts & Audio-Visual Stream:**
   - Listens to on-chain `Minted` events via WebSocket/polling.
   - Triggers native browser push notifications and sound alerts when new tokens are minted.
   - Automatically reverse-resolves minter addresses to primary ENS identities live in the stream.

---

## ⚡ Day 4 Assignment: Gasless Smart Account & Live Alerts

### 1. UserOperation Details & On-Chain Breakdown
- **Etherscan Transaction:** [https://sepolia.etherscan.io/tx/0x9014b7a7f09a2a5af8d320830f6f9ca2f956716b55783a5c82f4c9ea19887244](https://sepolia.etherscan.io/tx/0x9014b7a7f09a2a5af8d320830f6f9ca2f956716b55783a5c82f4c9ea19887244)
- **UserOp Hash (JiffyScan):** [`0x126d6eedf44fee08db3bff3a49a1b9ec55e5bff87daffe7819076eea4d74e716`](https://jiffyscan.xyz/userOpHash/0x126d6eedf44fee08db3bff3a49a1b9ec55e5bff87daffe7819076eea4d74e716)
- **Who is in the `From` field?**
  The Pimlico Bundler / Relayer address (`0x4337016838785634c63fce393bfc6222564436c4`). In ERC-4337, the end-user never broadcasts directly to the Ethereum mempool; instead, the Bundler packages the signed `UserOperation` into a standard on-chain transaction calling `handleOps()`.
- **Who is in the `To` field?**
  The canonical ERC-4337 **EntryPoint v0.7** contract (`0x0000000071727de22e5e9d8baf0edac6f37da032`). The EntryPoint coordinates user verification, ensures the paymaster pre-funds the execution, and executes the batch calls to the user's Smart Account (`0x79e66B0475844cE2550e848e8d1a708B41205Fe5`), which then mints the tokens on the `ClassNFT` contract.
- **Who paid the gas?**
  The **Pimlico Verifying Paymaster** (`0x777777777777AeC03fd955926DbF81597e66834C`). The bundler initially pays the upfront transaction gas, and the EntryPoint immediately refunds the bundler from the Paymaster's deposited ETH balance. The user's account paid 0 ETH.

### 2. Architecture Reflection: Live Alerts
> **Question:** *Your alert page only works while it's open. What would a real product do instead?*

A production-grade product would decouple event ingestion from client browsers by using an off-chain indexing service (such as Envio, The Graph Subgraphs, or Alchemy/Tenderly Webhooks) coupled with a 24/7 backend worker or serverless queue. When the smart contract emits a `Minted` event, the backend processes the transaction and dispatches notifications via persistent delivery rails such as Web Push (Service Workers), Push Protocol (EPNS), or messaging bots (Telegram, Discord, Email)—ensuring users receive immediate alerts even when their devices are locked or the browser tab is closed.

---

## 🔒 Security: Pinata Key & Server Route

### Why is the Pinata key in a server route, and what would happen if it started with `NEXT_PUBLIC_`?

The Pinata API key (`PINATA_JWT`) is strictly kept inside the Next.js server route (`/api/upload`) because server environment variables are only executed in a secure backend Node.js environment and are never sent to the client. If the variable were prefixed with `NEXT_PUBLIC_`, Next.js would inline the secret token directly into the browser's client-side JavaScript bundle during compilation. Anyone opening the browser dev tools or viewing the source code could steal the JWT, deplete the account's storage and bandwidth quotas, upload unauthorized or malicious content, or delete existing files pinned under that account.

---

## 📜 Smart Contracts Used

| Contract | Network | Address | Etherscan Link |
|---|---|---|---|
| **ClassNFT** (`ERC721URIStorage`) | Sepolia | `${NEXT_PUBLIC_NFT_ADDRESS}` | [Sepolia Etherscan](https://sepolia.etherscan.io/address/${NEXT_PUBLIC_NFT_ADDRESS}) |
| **Chainlink ETH / USD Feed** | Sepolia | `0x694AA1769357215DE4FAC081bf1f309aDC325306` | [Sepolia Etherscan](https://sepolia.etherscan.io/address/0x694AA1769357215DE4FAC081bf1f309aDC325306) |
| **ENS Universal Resolver** | Mainnet | `0xce01f8eee7E479C928F8919abD53E553a36CeF67` | [Mainnet Etherscan](https://etherscan.io/address/0xce01f8eee7E479C928F8919abD53E553a36CeF67) |

---

## ⚙️ Environment Variables Needed

Create a `.env.local` file inside the `frontend/` directory (or add them in your Vercel Project Settings under **Settings > Environment Variables**):

```env
# Required for IPFS uploads (Keep secret! NEVER prefix with NEXT_PUBLIC_)
PINATA_JWT=

# Required for ERC-4337 Bundler & Paymaster (Keep secret! NEVER prefix with NEXT_PUBLIC_)
PIMLICO_API_KEY=

# Required for Sepolia NFT contract interactions
NEXT_PUBLIC_NFT_ADDRESS=

# Optional: custom RPC endpoints (falls back to reliable public RPCs)
NEXT_PUBLIC_SEPOLIA_RPC_URL=
NEXT_PUBLIC_MAINNET_RPC_URL=
```

> **Note:** Never commit `.env` or `.env.local` files to Git. Both are included in `.gitignore`.

---

## 🛠️ How to Run Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Akanimoh12/Web3Bridge-Solidity-CohortXV.git
   cd Web3Bridge-Solidity-CohortXV/frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   # Fill in PINATA_JWT and NEXT_PUBLIC_NFT_ADDRESS
   ```

4. **Run the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for production:**
   ```bash
   npm run build
   ```

---

## 🚢 Deploying to Vercel

1. Push your code to your GitHub repository.
2. In the [Vercel Dashboard](https://vercel.com/dashboard), click **Add New Project** and import this repository.
3. Set the **Root Directory** to `frontend`.
4. Under **Environment Variables**, add:
   - `PINATA_JWT`: Your Pinata API JWT token (server-only).
   - `PIMLICO_API_KEY`: Your Pimlico API Key for ERC-4337 bundler & paymaster (server-only).
   - `NEXT_PUBLIC_NFT_ADDRESS`: The deployed Sepolia ClassNFT address.
   - `NEXT_PUBLIC_SEPOLIA_RPC_URL` (optional).
   - `NEXT_PUBLIC_MAINNET_RPC_URL` (optional).
5. Click **Deploy**.
