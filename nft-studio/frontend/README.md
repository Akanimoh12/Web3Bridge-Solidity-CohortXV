# NFT Studio

A React + Vite app for pinning NFT images and metadata to IPFS via Pinata, with
MetaMask wallet connection and ENS support on the Sepolia testnet.

## Requirements

- Node.js 18+ (the API routes use the global `fetch`, `FormData`, and `Blob`).
- A [Pinata](https://pinata.cloud/) account with an API key (JWT) for uploads.

## Environment variables

Copy the example file and fill in the values:

```sh
cp .env.example .env.local
```

| Variable              | Scope  | Purpose                                                        |
| --------------------- | ------ | -------------------------------------------------------------- |
| `PINATA_JWT`          | Server | Pinata API key JWT used by the upload endpoints. **Secret.**   |
| `VITE_MAINNET_RPC_URL`| Client | Ethereum mainnet RPC used for ENS lookups.                     |
| `VITE_SEPOLIA_RPC_URL`| Client | Sepolia RPC used when adding the network to a wallet.          |
| `VITE_CONTRACT_ADDRESS`| Client | ClassNFT contract address on Sepolia.                          |

`PINATA_JWT` **must not** use the `VITE_` prefix. Only variables prefixed with
`VITE_` are exposed to browser code. `PINATA_JWT` is read exclusively by the
serverless functions in `api/` and is never shipped to the client.

Never commit `.env` files. `.gitignore` already excludes `.env` and `.env.*`
(except `.env.example`).

## Local development

Install dependencies:

```sh
npm install
```

### Option A — Vite dev server (default)

```sh
npm run dev
```

`vite.config.js` includes a small middleware plugin that executes the handlers
in `api/` in-process, so `POST /api/upload-image` and
`POST /api/upload-metadata` work the same as they do on Vercel. `PINATA_JWT`
from `.env.local` is loaded into `process.env` for those handlers.

### Option B — Vercel local tooling

To exercise the real Vercel serverless runtime locally:

```sh
npm run dev:vercel
```

This runs `npx vercel dev`, which serves both the Vite app and the `api/`
functions. It requires a linked Vercel project (`npx vercel link`) and uses the
environment variables configured for that project.

## IPFS upload flow

1. The form (`src/components/CreateNftForm.jsx`) validates the selected image in
   the browser (`src/lib/ipfs.js`), then previews it.
2. `uploadImage` sends the raw file to `POST /api/upload-image`. The function
   validates the real file type (magic-byte sniffing) and size, pins it to
   Pinata, and returns `{ cid, uri: "ipfs://…", gatewayUrl }`.
3. `uploadMetadata` sends `{ name, description, image }` to
   `POST /api/upload-metadata`, where `image` is the `ipfs://` URI from step 2.
   The function validates the payload, pins the JSON, and returns the metadata
   CID and `ipfs://` URI for the minting stage.

Upload failures surface as clear messages and never report a false success. If
the image succeeds but metadata fails, the form offers a metadata-only retry.

## Scripts

| Command           | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `npm run dev`     | Vite dev server with in-process API routes.            |
| `npm run dev:vercel` | Vercel CLI dev server (real serverless runtime).    |
| `npm run build`   | Production build to `dist/`.                           |
| `npm run preview` | Preview the production build.                          |
| `npm run lint`    | Run ESLint.                                            |

## Deploying to Vercel

1. Import the project into Vercel (Vite framework preset; build output `dist`).
2. Add `PINATA_JWT` under **Project → Settings → Environment Variables**. Do not
   prefix it with `VITE_` and do not expose it to the client.
3. Add the `VITE_*` variables you use (RPC URLs, contract address) there as well.
4. The files in `api/` are detected automatically as serverless functions.

## Smart-contract integration

Minting is wired to the instructor's verified `ClassNFT` contract on Sepolia:

- **Address:** `0x39d7712A2E18d4c0597E849Cb9dc6869F6996639` (set as
  `VITE_CONTRACT_ADDRESS`). Verified on Sepolia Blockscout with contract name
  `ClassNFT`.
- **ABI:** `src/abi/ClassNFT.json`, derived from the verified contract source.
- **Mint function:** `mint(string uri)`, nonpayable (no fee). It stores the
  `ipfs://` metadata URI as the token's `tokenURI` and emits
  `Minted(address indexed to, uint256 indexed tokenId, string uri)`.
- **Token ID discovery:** the new token ID is read from the `Minted` event in the
  transaction receipt.
- **Enumeration:** the gallery reads `totalMinted()` and, for each token ID,
  `ownerOf(id)` and `tokenURI(id)`, then resolves the metadata JSON from the IPFS
  gateway.

Flow (`src/hooks/useMintNft.js`): detect the injected wallet → ensure Sepolia
(switch if needed) → `mint(uri)` via the signer → wait for the receipt → parse
the `Minted` event. Errors (rejection, insufficient funds, revert, RPC failure)
surface as clear messages and never report a false success.

## Known deployment details

The instructor's contract was located by matching the verified Sepolia source
against the class repository. Two other unverified `Web3Bridge Class` (W3B)
ERC721 contracts also exist on Sepolia; only the verified one is used here. If
your class provides a different address, set it in `VITE_CONTRACT_ADDRESS`.

## ETH/USD price feed (Chainlink)

The price panel reads the real Chainlink ETH/USD feed on Sepolia through its
contract interface — no price is hardcoded or mocked:

- **Feed:** `0x694AA1769357215DE4FAC081bf1f309aDC325306`.
- **Interface:** `decimals()` and `latestRoundData()` (see `src/lib/priceFeed.js`).
- **Provider:** `getSepoliaProvider()` in `src/lib/providers.js`. The feed is only
  queried after `getNetwork()` confirms chain id `11155111`; otherwise it errors
  instead of returning a value.
- **Polling:** `useEthPrice` (`src/hooks/useEthPrice.js`) refreshes every 30 s,
  guards against overlapping requests with an in-flight flag, and clears its
  `setTimeout`/`setInterval` on unmount.
- **Validation:** the answer must be positive, the decimals must be sane
  (0–30), the update timestamp must be valid, and `answeredInRound` must not lag
  `roundId`. Values older than 60 minutes are flagged **Stale** and never
  labelled "Live".
- **Failure states:** RPC/feed failures show an Unavailable/error state; if a
  refresh fails after a prior success, the last value is shown with an
  "Update failed" note (still subject to the stale check).

### Mint cost in USD

`getMintPaymentRequirement()` (`src/lib/contract.js`) inspects the ABI for a
payable `mint` and an optional zero-argument `uint256` price getter. The
`ClassNFT` `mint(string)` is **nonpayable**, so minting is **free** and the form
shows "Free" — this is not a claim about the NFT's market value. The USD estimate
path exists for contracts that charge a mint fee: it reads the price from the
contract and multiplies by the latest valid ETH/USD value, always labelling the
result an estimate and keeping the contract's required ETH amount authoritative.
Gallery cards show "Free" for this contract; historical mint-time USD is not
computed (an old ETH amount is never multiplied by today's price).



