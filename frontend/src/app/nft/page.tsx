"use client";

import { useEffect, useMemo, useState } from "react";
import { parseEventLogs, type Address } from "viem";
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { AddressLabel } from "@/components/AddressLabel";
import { NFT_ADDRESS, NFT_CONTRACT_ADDRESS, nftAbi, ipfsToHttp } from "@/contracts/nft";
import { uploadNft, type NftMetadata } from "@/lib/ipfs";
import { useEthUsdPrice } from "@/lib/price";

type GalleryItem = {
  tokenId: bigint;
  uri: string;
  owner: Address;
  metadata: NftMetadata;
};

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function parseMetadata(value: unknown): NftMetadata {
  if (
    typeof value !== "object" ||
    value === null ||
    !("name" in value) ||
    typeof value.name !== "string" ||
    !("description" in value) ||
    typeof value.description !== "string" ||
    !("image" in value) ||
    typeof value.image !== "string" ||
    !("referenceEth" in value) ||
    typeof value.referenceEth !== "string"
  ) {
    throw new Error("This token has malformed NFT metadata.");
  }
  return {
    name: value.name,
    description: value.description,
    image: value.image,
    referenceEth: value.referenceEth,
  };
}

function displayEthValue(value: string, ethUsd: number | undefined) {
  const eth = Number(value);
  if (!Number.isFinite(eth) || eth < 0 || ethUsd === undefined) return "Price unavailable";
  return `$${(eth * ethUsd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function NftPage() {
  const { address, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending: walletPending } = useWriteContract();
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const { priceUsd } = useEthUsdPrice();
  const {
    data: totalMinted,
    error: countError,
    isLoading: countLoading,
    refetch: refetchCount,
  } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: nftAbi,
    functionName: "totalMinted",
    chainId: sepolia.id,
    query: { enabled: Boolean(NFT_ADDRESS), refetchInterval: 30_000 },
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [referenceEth, setReferenceEth] = useState("0.01");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>();
  const [status, setStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [minted, setMinted] = useState<{ tokenId: string; hash: string; uri: string }>();

  const referenceValue = Number(referenceEth);
  const isValidReference = Number.isFinite(referenceValue) && referenceValue >= 0 && referenceEth.trim() !== "";
  const estimatedValue = useMemo(() => {
    if (priceUsd === undefined || !isValidReference) return undefined;
    return referenceValue * priceUsd;
  }, [isValidReference, priceUsd, referenceValue]);

  useEffect(() => {
    if (!image) {
      setPreview(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(image);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  useEffect(() => {
    if (NFT_ADDRESS === undefined) return;
    const nftAddress: Address = NFT_ADDRESS;
    const client = publicClient;
    if (!client || totalMinted === undefined) return;
    let cancelled = false;

    async function loadGallery() {
      setGalleryLoading(true);
      setGalleryError("");
      try {
        const count = Number(totalMinted);
        if (!Number.isSafeInteger(count)) throw new Error("The collection is too large to load safely.");
        const loaded = await Promise.all(
          Array.from({ length: count }, async (_, index) => {
            const tokenId = BigInt(index);
            const [uri, owner] = await Promise.all([
              client.readContract({
                address: nftAddress,
                abi: nftAbi,
                functionName: "tokenURI",
                args: [tokenId],
              }),
              client.readContract({
                address: nftAddress,
                abi: nftAbi,
                functionName: "ownerOf",
                args: [tokenId],
              }),
            ]);
            const metadataResponse = await fetch(ipfsToHttp(uri), { cache: "no-store" });
            if (!metadataResponse.ok) throw new Error(`Metadata for token #${tokenId} is not available from IPFS.`);
            const metadata = parseMetadata(await metadataResponse.json());
            return { tokenId, uri, owner, metadata };
          }),
        );
        if (!cancelled) setItems(loaded.reverse());
      } catch (error) {
        if (!cancelled) setGalleryError(error instanceof Error ? error.message : "The gallery could not be loaded.");
      } finally {
        if (!cancelled) setGalleryLoading(false);
      }
    }

    void loadGallery();
    return () => {
      cancelled = true;
    };
  }, [publicClient, refreshVersion, totalMinted]);

  async function mintNft() {
    if (!NFT_ADDRESS) {
      setStatus("The collection contract address is not configured yet.");
      return;
    }
    if (!address || !image || !name.trim() || !isValidReference) return;

    setIsUploading(true);
    setMinted(undefined);
    try {
      setStatus("Switching to Sepolia…");
      await switchChainAsync({ chainId: sepolia.id });
      setStatus("Uploading image and metadata to IPFS…");
      const uri = await uploadNft(image, name.trim(), description.trim(), referenceEth.trim());

      setStatus("Confirm the mint in your wallet…");
      const hash = await writeContractAsync({
        address: NFT_ADDRESS,
        abi: nftAbi,
        functionName: "mint",
        args: [uri],
        chainId: sepolia.id,
      });

      setStatus("Waiting for the mint to confirm…");
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      const [event] = parseEventLogs({ abi: nftAbi, logs: receipt.logs, eventName: "Minted" });
      const tokenId = event.args.tokenId.toString();
      setMinted({ tokenId, hash, uri });
      setStatus(`Token #${tokenId} is minted and stored on IPFS.`);
      await refetchCount();
      setRefreshVersion((version) => version + 1);
    } catch (error) {
      setStatus(error instanceof Error ? `Mint failed: ${error.message}` : "Mint failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="shell page-shell">
      <div className="page-intro studio-intro">
        <p className="eyebrow"><span className="eyebrow-line" />THE NFT STUDIO</p>
        <h1>Make it. Mint it.<br /><span>Keep it forever.</span></h1>
        <p>A small collection of moments, stored on IPFS and owned on Sepolia.</p>
      </div>

      {!NFT_ADDRESS && (
        <div className="notice notice-error">
          <strong>Collection address not set.</strong> Add <code>NEXT_PUBLIC_NFT_ADDRESS</code> to the frontend environment
          after deploying the ClassNFT contract.
        </div>
      )}

      <div className="studio-grid">
        <section className="panel mint-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">01 / CREATE</p><h2>Your next original</h2></div>
            <span className="step-chip">NEW NFT</span>
          </div>

          <label className="upload-box" htmlFor="nft-image">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="upload-preview" src={preview} alt="Preview of the selected artwork" />
            ) : (
              <span className="upload-placeholder">
                <span className="upload-icon">↑</span>
                <strong>Drop in your artwork</strong>
                <span>PNG, JPG, WebP or GIF · up to 8 MB</span>
              </span>
            )}
            <input
              id="nft-image"
              className="visually-hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
                  setStatus("Choose a PNG, JPEG, WebP, or GIF image.");
                  setImage(null);
                } else if (file.size > MAX_IMAGE_SIZE) {
                  setStatus("Choose an image smaller than 8 MB.");
                  setImage(null);
                } else {
                  setStatus("");
                  setImage(file);
                }
              }}
            />
          </label>

          <div className="form-fields">
            <div>
              <label className="field-label" htmlFor="art-name">Title</label>
              <input id="art-name" className="text-input" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Name your piece" />
            </div>
            <div>
              <label className="field-label" htmlFor="art-description">Story <span className="optional">(optional)</span></label>
              <textarea id="art-description" className="text-input text-area" maxLength={500} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What should people know about it?" />
            </div>
            <div>
              <label className="field-label" htmlFor="reference-value">Reference value <span className="optional">(ETH)</span></label>
              <div className="value-input-row">
                <input id="reference-value" className="text-input" type="number" min="0" step="any" value={referenceEth} onChange={(event) => setReferenceEth(event.target.value)} />
                <span className="value-unit">ETH</span>
              </div>
              <p className="field-hint">
                {estimatedValue !== undefined
                  ? `About $${estimatedValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} at the live Chainlink rate. This is your reference estimate, not a market quote.`
                  : "Live USD estimate will appear when the Chainlink feed loads."}
              </p>
            </div>
          </div>

          <button
            className="button button-dark mint-button"
            disabled={!isConnected || !image || !name.trim() || !isValidReference || isUploading || walletPending || !NFT_ADDRESS}
            onClick={mintNft}
          >
            {isUploading || walletPending ? "Working…" : "Upload to IPFS & mint"} <span aria-hidden="true">↗</span>
          </button>
          {!isConnected && <p className="field-hint">Connect your wallet to mint on Sepolia.</p>}
          {status && <p className={`form-message ${status.startsWith("Mint failed") ? "error-message" : ""}`} aria-live="polite">{status}</p>}
          {minted && (
            <div className="success-card">
              <strong>Token #{minted.tokenId} is in the collection.</strong>
              <a href={`https://sepolia.etherscan.io/tx/${minted.hash}`} target="_blank" rel="noreferrer">View mint transaction ↗</a>
              <a href={ipfsToHttp(minted.uri)} target="_blank" rel="noreferrer">View IPFS metadata ↗</a>
            </div>
          )}
        </section>

        <aside className="studio-aside">
          <div className="aside-card aside-dark">
            <p className="eyebrow">THE CREATOR’S NOTE</p>
            <h2>Art, without the middleman.</h2>
            <p>Your image and its story are uploaded to public IPFS through a private server route. The NFT points to that permanent metadata.</p>
            <div className="aside-divider" />
            <p className="aside-small">Storage: IPFS<br />Network: Sepolia<br />Format: ERC-721</p>
          </div>
          <div className="aside-card aside-price">
            <p className="eyebrow">A LIVE REFERENCE</p>
            <p>USD values recalculate as Chainlink’s Sepolia ETH/USD feed updates.</p>
            <a href="https://sepolia.etherscan.io/address/0x694AA1769357215DE4FAC081bf1f309aDC325306" target="_blank" rel="noreferrer">View Chainlink feed ↗</a>
          </div>
        </aside>
      </div>

      <section className="gallery-section">
        <div className="section-heading gallery-heading">
          <div><p className="eyebrow">02 / THE COLLECTION</p><h2>Made here, held everywhere.</h2></div>
          <span className="collection-count">{totalMinted?.toString() ?? "—"} pieces</span>
        </div>
        {countLoading || galleryLoading ? <p className="form-message">Loading the collection…</p> : null}
        {countError && <p className="form-message error-message">Could not read the collection. Confirm the NFT address and Sepolia RPC settings.</p>}
        {galleryError && <p className="form-message error-message">{galleryError}</p>}
        {!countLoading && totalMinted === 0n && (
          <div className="empty-gallery"><span>✳</span><p>The first piece is waiting to be made.</p></div>
        )}
        {items.length > 0 && (
          <div className="gallery-grid">
            {items.map((item) => (
              <article className="artwork-card" key={item.tokenId.toString()}>
                <a className="artwork-image-wrap" href={ipfsToHttp(item.metadata.image)} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="artwork-image" src={ipfsToHttp(item.metadata.image)} alt={item.metadata.name} loading="lazy" />
                  <span className="token-number">#{item.tokenId.toString().padStart(3, "0")}</span>
                </a>
                <div className="artwork-info">
                  <div className="artwork-title-row">
                    <h3>{item.metadata.name}</h3>
                    <span className="artwork-value">{displayEthValue(item.metadata.referenceEth, priceUsd)}</span>
                  </div>
                  {item.metadata.description && <p className="artwork-description">{item.metadata.description}</p>}
                  <p className="artwork-owner">Collected by <AddressLabel address={item.owner} /></p>
                  <a className="metadata-link" href={ipfsToHttp(item.uri)} target="_blank" rel="noreferrer">IPFS metadata ↗</a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <footer className="site-footer"><span>W3B STUDIO</span><span>Each item is an original.</span></footer>
    </div>
  );
}
