
"use client";

import { useEffect, useState } from "react";
import { parseEventLogs } from "viem";
import {
  useAccount,
  useEnsName,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { NFT_ADDRESS, nftAbi } from "@/contracts/nft";
import { uploadNft } from "@/lib/ipfs";

type Metadata = {
  name: string;
  description: string;
  image: string;
};

type MintedNFT = {
  tokenId: string;
  uri: string;
  hash: `0x${string}`;
};

type MetadataRecord = {
  uri: string;
  data: Metadata;
};

// Convert an IPFS URI into public gateway URLs.
function ipfsGateways(uri: string): string[] {
  if (!uri.startsWith("ipfs://")) {
    throw new Error("Invalid IPFS URI");
  }

  const path = uri.slice(7).replace(/^ipfs\//, "");

  if (
    !path ||
    !/^[a-zA-Z0-9._/-]+$/.test(path) ||
    path.split("/").includes("..")
  ) {
    throw new Error("Invalid IPFS path");
  }

  return [
    `https://gateway.pinata.cloud/ipfs/${path}`,
    `https://ipfs.io/ipfs/${path}`,
  ];
}

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function NftPage() {
  // Wallet connection
  const { isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const publicClient = usePublicClient({
    chainId: sepolia.id,
  });

  // NFT creation form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);

  const [status, setStatus] = useState("");
  const [mintError, setMintError] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [minted, setMinted] = useState<MintedNFT | null>(null);

  // NFT lookup
  const [viewId, setViewId] = useState("0");

  const validId = /^\d+$/.test(viewId.trim());
  const tokenId = validId ? BigInt(viewId) : null;

  const {
    data: tokenUri,
    isPending: uriLoading,
    isError: uriError,
    refetch: refetchTokenUri,
  } = useReadContract({
    address: NFT_ADDRESS,
    abi: nftAbi,
    functionName: "tokenURI",
    args: [tokenId ?? 0n],
    chainId: sepolia.id,
    query: {
      enabled: tokenId !== null,
      retry: false,
      refetchOnWindowFocus: true,
    },
  });

  const {
    data: owner,
    isPending: ownerLoading,
    refetch: refetchOwner,
  } = useReadContract({
    address: NFT_ADDRESS,
    abi: nftAbi,
    functionName: "ownerOf",
    args: [tokenId ?? 0n],
    chainId: sepolia.id,
    query: {
      enabled: tokenId !== null,
      retry: false,
      refetchOnWindowFocus: true,
    },
  });

  // ENS: resolve the NFT owner's primary name
  const { data: ownerEns } = useEnsName({
    address: owner,
    chainId: mainnet.id,
    query: {
      enabled: Boolean(owner),
    },
  });

  // IPFS metadata
  const [metadataRecord, setMetadataRecord] =
    useState<MetadataRecord | null>(null);

  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [imageGateway, setImageGateway] = useState(0);
  const [imageError, setImageError] = useState(false);

  // Automatically load NFT metadata from IPFS
  useEffect(() => {
    if (!tokenUri) return;

    const currentUri = tokenUri;
    const controller = new AbortController();

    async function loadMetadata() {
      setMetaLoading(true);
      setMetaError("");
      setMetadataRecord(null);
      setImageGateway(0);
      setImageError(false);

      try {
        const gateways = ipfsGateways(currentUri);

        let loadedMetadata: Metadata | null = null;

        for (const gateway of gateways) {
          try {
            const response = await fetch(gateway, {
              signal: controller.signal,
            });

            if (!response.ok) {
              throw new Error(
                `IPFS gateway returned ${response.status}`
              );
            }

            const result: unknown = await response.json();

            if (
              !result ||
              typeof result !== "object" ||
              !("name" in result) ||
              !("image" in result) ||
              typeof result.name !== "string" ||
              typeof result.image !== "string" ||
              !result.image.startsWith("ipfs://")
            ) {
              throw new Error("Invalid NFT metadata");
            }

            loadedMetadata = {
              name: result.name,
              image: result.image,
              description:
                "description" in result &&
                typeof result.description === "string"
                  ? result.description
                  : "",
            };

            break;
          } catch (error) {
            if (controller.signal.aborted) return;

            console.warn(
              "IPFS gateway request failed:",
              error
            );
          }
        }

        if (!loadedMetadata) {
          throw new Error(
            "Could not retrieve NFT metadata from IPFS."
          );
        }

        if (!controller.signal.aborted) {
          setMetadataRecord({
            uri: currentUri,
            data: loadedMetadata,
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setMetaError(
            error instanceof Error
              ? error.message
              : "Failed to load NFT metadata."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setMetaLoading(false);
        }
      }
    }

    void loadMetadata();

    return () => controller.abort();
  }, [tokenUri, reloadKey]);

  // Safe TypeScript narrowing
  const metadata: Metadata | null =
    metadataRecord !== null &&
    metadataRecord.uri === tokenUri
      ? metadataRecord.data
      : null;

  let imageUrls: string[] = [];

  if (metadata !== null) {
    try {
      imageUrls = ipfsGateways(metadata.image);
    } catch {
      imageUrls = [];
    }
  }

  // Mint NFT through MetaMask
  async function mint() {
    if (!isConnected) {
      setMintError("Please connect your wallet.");
      return;
    }

    if (!image || !name.trim()) {
      setMintError("Enter an NFT name and select an image.");
      return;
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(image.type)) {
      setMintError("Only PNG, JPG, WEBP and GIF are allowed.");
      return;
    }

    if (image.size > 5 * 1024 * 1024) {
      setMintError("Image must be smaller than 5 MB.");
      return;
    }

    if (!publicClient) {
      setMintError("Sepolia RPC is unavailable.");
      return;
    }

    setIsMinting(true);
    setMintError("");
    setMinted(null);

    try {
      // 1. Upload image and metadata to Pinata
      setStatus(
        "Step 1 of 3: Uploading image and metadata to IPFS..."
      );

      const uri = await uploadNft(
        image,
        name.trim(),
        description.trim()
      );

      // 2. Ask the wallet to mint on Sepolia
      setStatus(
        "Step 2 of 3: Confirm the transaction in MetaMask..."
      );

      if (chainId !== sepolia.id) {
        await switchChainAsync({
          chainId: sepolia.id,
        });
      }

      const hash = await writeContractAsync({
        address: NFT_ADDRESS,
        abi: nftAbi,
        functionName: "mint",
        args: [uri],
        chainId: sepolia.id,
      });

      // 3. Wait for blockchain confirmation
      setStatus(
        "Step 3 of 3: Waiting for Sepolia confirmation..."
      );

      const receipt =
        await publicClient.waitForTransactionReceipt({
          hash,
        });

      if (receipt.status !== "success") {
        throw new Error("Mint transaction reverted.");
      }

      const events = parseEventLogs({
        abi: nftAbi,
        logs: receipt.logs,
        eventName: "Minted",
      });

      const event = events[0];

      if (!event) {
        throw new Error(
          "Transaction confirmed but Minted event was not found."
        );
      }

      const newId = event.args.tokenId.toString();

      setMinted({
        tokenId: newId,
        uri,
        hash,
      });

      // Automatically select the minted NFT
      setViewId(newId);
      setReloadKey((value) => value + 1);

      // Refresh onchain reads
      await Promise.all([
        refetchTokenUri(),
        refetchOwner(),
      ]);

      setStatus("NFT minted successfully!");
    } catch (error) {
      setStatus("");

      setMintError(
        error instanceof Error
          ? error.message
          : "An unexpected minting error occurred."
      );
    } finally {
      setIsMinting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 text-white">
      {/* Page heading */}
      <header className="space-y-3">
        <p className="text-sm font-medium text-emerald-400">
          BridgeID / NFT Studio
        </p>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Create your onchain identity
        </h1>

        <p className="text-neutral-400">
          Upload your picture to IPFS and mint a unique
          NFT on Ethereum Sepolia.
        </p>
      </header>

      {/* Mint form */}
      <section className="space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:p-7">
        <div>
          <h2 className="text-xl font-semibold">
            Create an NFT
          </h2>

          <p className="mt-1 text-sm text-neutral-400">
            Your picture and metadata are stored on IPFS
            using Pinata.
          </p>
        </div>

        {/* NFT name */}
        <div className="space-y-2">
          <label
            htmlFor="nft-name"
            className="block text-sm font-medium"
          >
            NFT name
          </label>

          <input
            id="nft-name"
            type="text"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="My Web3 Profile"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-500 focus:border-emerald-400"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label
            htmlFor="nft-description"
            className="block text-sm font-medium"
          >
            Description
          </label>

          <textarea
            id="nft-description"
            value={description}
            maxLength={500}
            rows={3}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            placeholder="Tell us about your NFT..."
            className="w-full resize-y rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-500 focus:border-emerald-400"
          />
        </div>

        {/* File upload */}
        <div className="space-y-2">
          <label
            htmlFor="nft-image"
            className="block text-sm font-medium"
          >
            NFT picture
          </label>

          <input
            id="nft-image"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(event) =>
              setImage(event.target.files?.[0] ?? null)
            }
            className="block w-full rounded-xl border border-dashed border-neutral-700 bg-neutral-950 p-4 text-sm text-neutral-300 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-700 file:px-3 file:py-2 file:text-white"
          />

          <p className="text-xs text-neutral-500">
            PNG, JPG, WEBP or GIF. Maximum 5 MB.
          </p>
        </div>

        {!isConnected && (
          <p className="rounded-xl border border-amber-900 bg-amber-950/40 p-3 text-sm text-amber-300">
            Connect your wallet using the button in the
            navigation bar before minting.
          </p>
        )}

        {/* Mint button */}
        <button
          type="button"
          disabled={
            !isConnected ||
            !image ||
            !name.trim() ||
            isMinting
          }
          onClick={mint}
          className="w-full rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-neutral-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isMinting
            ? "Processing transaction..."
            : "Upload to IPFS and Mint NFT"}
        </button>

        {/* Status */}
        {status && (
          <p
            role="status"
            className="rounded-xl border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300"
          >
            {status}
          </p>
        )}

        {/* Error */}
        {mintError && (
          <p
            role="alert"
            className="break-words rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-300"
          >
            {mintError}
          </p>
        )}

        {/* Mint success */}
        {minted && (
          <div className="space-y-3 rounded-xl border border-emerald-900 bg-emerald-950/30 p-4">
            <p className="font-semibold text-emerald-300">
              Your NFT has been minted!
            </p>

            <p className="text-sm">
              Token ID: {minted.tokenId}
            </p>

            <p className="break-all text-xs text-neutral-400">
              Metadata URI: {minted.uri}
            </p>

            <a
              href={`https://sepolia.etherscan.io/tx/${minted.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-emerald-400 underline"
            >
              View transaction on Etherscan
            </a>
          </div>
        )}
      </section>

      {/* NFT explorer */}
      <section className="space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:p-7">
        <div>
          <h2 className="text-xl font-semibold">
            Explore minted NFTs
          </h2>

          <p className="mt-1 text-sm text-neutral-400">
            Enter a token ID to view its NFT image,
            metadata and owner.
          </p>
        </div>

        {/* Token ID input */}
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="token-id"
            className="text-sm font-medium"
          >
            Token ID
          </label>

          <input
            id="token-id"
            type="text"
            inputMode="numeric"
            value={viewId}
            onChange={(event) =>
              setViewId(event.target.value)
            }
            className="w-28 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2 text-white outline-none focus:border-emerald-400"
          />

          <button
            type="button"
            onClick={async () => {
              await Promise.all([
                refetchTokenUri(),
                refetchOwner(),
              ]);
              setReloadKey((value) => value + 1);
            }}
            className="rounded-xl border border-neutral-700 px-4 py-2 text-sm transition hover:bg-neutral-800"
          >
            Retry load
          </button>
        </div>

        {!validId && (
          <p className="text-sm text-amber-300">
            Please enter a valid numeric token ID.
          </p>
        )}

        {validId && uriLoading && (
          <p className="text-sm text-neutral-400">
            Reading NFT from Sepolia...
          </p>
        )}

        {validId && uriError && (
          <p className="text-sm text-red-400">
            Token not found or contract read failed.
          </p>
        )}

        {/* NFT owner */}
        {tokenUri && (
          <div className="space-y-2 text-sm">
            <p className="break-all text-neutral-300">
              Owner:{" "}
              <span className="font-medium text-white">
                {ownerLoading
                  ? "Loading..."
                  : ownerEns ??
                    (owner
                      ? shortAddress(owner)
                      : "Unavailable")}
              </span>
            </p>

            {owner && (
              <a
                href={`https://sepolia.etherscan.io/address/${owner}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-emerald-400 underline"
              >
                View owner on Etherscan
              </a>
            )}

            <p className="break-all text-xs text-neutral-500">
              tokenURI: {tokenUri}
            </p>
          </div>
        )}

        {/* IPFS loading */}
        {metaLoading && (
          <p className="text-sm text-neutral-400">
            Loading artwork from IPFS...
          </p>
        )}

        {/* IPFS error */}
        {metaError && (
          <p
            role="alert"
            className="text-sm text-red-400"
          >
            {metaError}
          </p>
        )}

        {/* NFT card */}
        {metadata && (
          <article className="overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-950">
            {imageUrls.length > 0 && !imageError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${metadata.image}-${imageGateway}`}
                src={imageUrls[imageGateway]}
                alt={metadata.name}
                className="max-h-[450px] w-full bg-neutral-900 object-contain"
                onError={() => {
                  if (
                    imageGateway <
                    imageUrls.length - 1
                  ) {
                    setImageGateway(
                      (current) => current + 1
                    );
                  } else {
                    setImageError(true);
                  }
                }}
              />
            ) : (
              <div className="p-6 text-center text-sm text-amber-300">
                Image could not be loaded from IPFS.
              </div>
            )}

            <div className="space-y-3 p-5">
              <h3 className="text-xl font-semibold">
                {metadata.name}
              </h3>

              {metadata.description && (
                <p className="text-sm text-neutral-400">
                  {metadata.description}
                </p>
              )}

              <div className="flex flex-wrap gap-4 text-sm">
                {imageUrls.length > 0 && (
                  <a
                    href={imageUrls[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 underline"
                  >
                    Open image on IPFS
                  </a>
                )}

                {tokenUri && (
                  <a
                    href={ipfsGateways(tokenUri)[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 underline"
                  >
                    View metadata JSON
                  </a>
                )}
              </div>
            </div>
          </article>
        )}
      </section>
    </div>
  );
}
