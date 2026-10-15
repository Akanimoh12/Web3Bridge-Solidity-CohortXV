"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { parseEventLogs, type Address, type Hash } from "viem";
import { useAccount, useEnsName, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { NFT_ADDRESS, nftAbi } from "@/contracts/nft";
import { fetchNftMetadata, ipfsToHttp, uploadNft, type NftMetadata } from "@/lib/ipfs";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type Result = {
  tokenId: string;
  uri: string;
  owner: Address;
  metadata: NftMetadata;
  hash?: Hash;
};

type MintStep = "idle" | "uploading" | "wallet" | "confirming" | "complete";
const steps: { key: MintStep; label: string }[] = [
  { key: "idle", label: "Picture" },
  { key: "uploading", label: "IPFS" },
  { key: "wallet", label: "Sepolia" },
  { key: "complete", label: "Profile" },
];

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/rejected|denied|cancelled/i.test(message)) return "The request was cancelled in your wallet. Nothing was minted.";
  if (/insufficient funds/i.test(message)) return "Your wallet needs more Sepolia ETH for gas.";
  if (/chain|network|switch/i.test(message)) return "Switch your wallet to Sepolia, then try again.";
  if (/IPFS|Pinata|upload|metadata/i.test(message)) return message;
  return "Something interrupted the mint. Check your wallet and connection, then try again.";
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function ProfileResult({ result }: { result: Result }) {
  const { data: ownerEns } = useEnsName({ address: result.owner, chainId: mainnet.id });

  return (
    <article className="mint-result" aria-labelledby={`profile-${result.tokenId}`}>
      <div className="result-banner"><span>Profile card verified on Sepolia</span></div>
      <div className="result-body">
        <div className="result-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ipfsToHttp(result.metadata.image)} alt={`${result.metadata.name} profile`} />
        </div>
        <div className="result-copy">
          <span className="token-label">Web3Bridge Class · Token #{result.tokenId}</span>
          <h2 id={`profile-${result.tokenId}`}>{result.metadata.name}</h2>
          <p>{result.metadata.description}</p>
          <dl>
            <div><dt>Owner</dt><dd title={result.owner}>{ownerEns ?? shortAddress(result.owner)}</dd></div>
            <div><dt>Metadata</dt><dd><a href={ipfsToHttp(result.uri)} target="_blank" rel="noreferrer">Open on IPFS ↗</a></dd></div>
          </dl>
          {result.hash && (
            <a className="secondary-button" href={`https://sepolia.etherscan.io/tx/${result.hash}`} target="_blank" rel="noreferrer">
              View transaction on Etherscan ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function NftPage() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: sepolia.id });

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [step, setStep] = useState<MintStep>("idle");
  const [mintError, setMintError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [lookupStatus, setLookupStatus] = useState("");
  const [lookupResult, setLookupResult] = useState<Result | null>(null);

  const previewUrl = useMemo(() => (image ? URL.createObjectURL(image) : ""), [image]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const activeStep = step === "confirming" ? "wallet" : step;
  const activeIndex = steps.findIndex((item) => item.key === activeStep);
  const isBusy = step !== "idle" && step !== "complete";

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImageError("");
    if (!file) return setImage(null);
    if (!IMAGE_TYPES.includes(file.type)) {
      setImage(null);
      setImageError("Choose a PNG, JPG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImage(null);
      setImageError("Choose an image smaller than 5 MB.");
      return;
    }
    setImage(file);
  }

  async function mint(event: FormEvent) {
    event.preventDefault();
    setMintError("");
    setResult(null);

    if (!isConnected || !address) return setMintError("Connect your wallet before minting.");
    if (!name.trim() || !bio.trim() || !image) return setMintError("Add a name, short bio, and profile picture.");
    if (!publicClient) return setMintError("The Sepolia connection is not ready. Try again.");

    try {
      setStep("uploading");
      const uri = await uploadNft(image, name.trim(), bio.trim());

      setStep("wallet");
      if (chainId !== sepolia.id) await switchChainAsync({ chainId: sepolia.id });
      const hash = await writeContractAsync({
        address: NFT_ADDRESS,
        abi: nftAbi,
        functionName: "mint",
        args: [uri],
        chainId: sepolia.id,
      });

      setStep("confirming");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The mint transaction reverted.");

      const [mintedEvent] = parseEventLogs({ abi: nftAbi, logs: receipt.logs, eventName: "Minted" });
      if (!mintedEvent) throw new Error("The mint event was not found in the receipt.");

      const tokenId = mintedEvent.args.tokenId;
      const [uriFromChain, owner] = await Promise.all([
        publicClient.readContract({ address: NFT_ADDRESS, abi: nftAbi, functionName: "tokenURI", args: [tokenId] }),
        publicClient.readContract({ address: NFT_ADDRESS, abi: nftAbi, functionName: "ownerOf", args: [tokenId] }),
      ]);
      const metadata = await fetchNftMetadata(uriFromChain);

      setResult({ tokenId: tokenId.toString(), uri: uriFromChain, owner, metadata, hash });
      setLookupId(tokenId.toString());
      setStep("complete");
    } catch (error) {
      setStep("idle");
      setMintError(friendlyError(error));
    }
  }

  async function loadToken(event: FormEvent) {
    event.preventDefault();
    setLookupResult(null);
    if (!/^\d+$/.test(lookupId)) return setLookupStatus("Enter a whole token ID, such as 0.");
    if (!publicClient) return setLookupStatus("The Sepolia connection is not ready.");

    try {
      setLookupStatus("Reading the token from Sepolia…");
      const tokenId = BigInt(lookupId);
      const [uri, owner] = await Promise.all([
        publicClient.readContract({ address: NFT_ADDRESS, abi: nftAbi, functionName: "tokenURI", args: [tokenId] }),
        publicClient.readContract({ address: NFT_ADDRESS, abi: nftAbi, functionName: "ownerOf", args: [tokenId] }),
      ]);
      const metadata = await fetchNftMetadata(uri);
      setLookupResult({ tokenId: lookupId, uri, owner, metadata });
      setLookupStatus("");
    } catch {
      setLookupStatus("That token was not found, or its IPFS metadata is not available yet.");
    }
  }

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <h1>Make my profile card</h1>
          <p>Pin a picture and bio to IPFS, then mint the metadata URI through the verified ClassNFT contract.</p>
        </div>
        <span className="network-stamp">Mints on Sepolia</span>
      </header>

      <div className="mint-layout">
        <section className="folio-panel mint-panel" aria-labelledby="mint-heading">
          <div className="section-heading-row">
            <div><h2 id="mint-heading">Create your card</h2><p className="section-copy">Your picture uploads only when you press mint.</p></div>
            <span className={chainId === sepolia.id ? "network-ready" : "network-waiting"}>{chainId === sepolia.id ? "Sepolia ready" : "Sepolia required"}</span>
          </div>

          <ol className="stage-rail" aria-label="Mint progress">
            {steps.map((item, index) => (
              <li key={item.key} className={index < activeIndex || step === "complete" ? "is-done" : index === activeIndex ? "is-active" : ""}>
                <span>{index + 1}</span>{item.label}
              </li>
            ))}
          </ol>

          <form className="profile-form" onSubmit={mint}>
            <div className="field-group">
              <label htmlFor="profile-name">Profile name</label>
              <input id="profile-name" className="text-field" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ada Builder" required />
              <span className="field-count">{name.length}/80</span>
            </div>

            <div className="field-group">
              <label htmlFor="profile-bio">Short bio</label>
              <textarea id="profile-bio" className="text-field" rows={4} maxLength={280} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Builder, student, and lifelong learner exploring onchain identity." required />
              <span className="field-count">{bio.length}/280</span>
            </div>

            <div className="image-field">
              <div>
                <label htmlFor="profile-image">Profile picture</label>
                <label className="file-drop" htmlFor="profile-image">
                  <strong>{image ? image.name : "Choose an image"}</strong>
                  <span>PNG, JPG, WebP, or GIF · 5 MB maximum</span>
                </label>
                <input id="profile-image" className="visually-hidden" type="file" accept={IMAGE_TYPES.join(",")} onChange={chooseImage} />
                {imageError && <p className="error-message" role="alert">{imageError}</p>}
              </div>
              <div className="image-preview" aria-label="Profile picture preview">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Selected profile preview" />
                ) : <span>Preview</span>}
              </div>
            </div>

            <div className="mint-actions">
              {!isConnected && <p>Connect your wallet in the header to mint.</p>}
              {isConnected && chainId !== sepolia.id && <p>Your wallet will ask to switch to Sepolia before minting.</p>}
              <button className="primary-button mint-button" disabled={!isConnected || !image || !name.trim() || !bio.trim() || isBusy}>
                {step === "uploading" && "Uploading to IPFS…"}
                {step === "wallet" && "Confirm in your wallet…"}
                {step === "confirming" && "Waiting for confirmation…"}
                {(step === "idle" || step === "complete") && "Upload and mint profile NFT"}
              </button>
            </div>
            {mintError && <div className="error-box" role="alert"><strong>Mint not completed</strong><p>{mintError}</p></div>}
          </form>
        </section>

        <aside className="preview-column">
          {result ? <ProfileResult result={result} /> : (
            <div className="profile-preview-card">
              <div className="preview-image-large">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Profile card preview" />
                ) : <span>Your image</span>}
              </div>
              <span className="token-label">Web3Bridge Class · Preview</span>
              <h2>{name || "Your profile name"}</h2>
              <p>{bio || "Your short bio will appear here before you mint."}</p>
              <div className="preview-owner"><span>Owner</span><strong>{address ? shortAddress(address) : "Connect wallet"}</strong></div>
            </div>
          )}
        </aside>
      </div>

      <section className="lookup-section" aria-labelledby="lookup-heading">
        <div>
          <h2 id="lookup-heading">View an existing profile NFT</h2>
          <p>Read any ClassNFT again after reloading this page. No wallet connection is needed.</p>
        </div>
        <form className="token-lookup" onSubmit={loadToken}>
          <label htmlFor="token-id">Token ID</label>
          <div className="input-action compact-input">
            <input id="token-id" className="text-field" inputMode="numeric" value={lookupId} onChange={(event) => setLookupId(event.target.value)} placeholder="0" />
            <button className="secondary-button">Load profile</button>
          </div>
          {lookupStatus && <p className="field-help" role="status">{lookupStatus}</p>}
        </form>
      </section>

      {lookupResult && <ProfileResult result={lookupResult} />}
    </div>
  );
}
