"use client";

import { useState } from "react";
import { parseEventLogs } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { NFT_ADDRESS, nftAbi, ipfsToHttp } from "@/contracts/nft";
import { uploadNft } from "@/lib/ipfs";
import { useChainlinkPrice } from "@/hooks/useChainlinkPrice";

interface MintStudioProps {
  onMintSuccess?: () => void;
}

export function MintStudio({ onMintSuccess }: MintStudioProps) {
  const { isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const { price: ethPrice } = useChainlinkPrice();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepStatus, setStepStatus] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mintedResult, setMintedResult] = useState<{
    tokenId: string;
    uri: string;
    hash: string;
    imageUrl?: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setErrorMsg(null);
    if (selected) {
      const url = URL.createObjectURL(selected);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setMintedResult(null);

    try {
      // 1. Upload image & metadata through our server route to Pinata
      setStepStatus("1/3 Uploading image & metadata to IPFS via Pinata…");
      const metadataUri = await uploadNft(file, name.trim(), description.trim());

      // 2. Ensure user is connected to Sepolia
      setStepStatus("2/3 Prompting wallet to sign mint transaction on Sepolia…");
      if (chainId !== sepolia.id) {
        await switchChainAsync({ chainId: sepolia.id });
      }

      const hash = await writeContractAsync({
        address: NFT_ADDRESS,
        abi: nftAbi,
        functionName: "mint",
        args: [metadataUri],
        chainId: sepolia.id,
      });

      // 3. Wait for transaction receipt
      setStepStatus("3/3 Waiting for block confirmation on Sepolia…");
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });

      const logs = parseEventLogs({
        abi: nftAbi,
        logs: receipt.logs,
        eventName: "Minted",
      });

      const tokenId = logs[0]?.args?.tokenId !== undefined ? logs[0].args.tokenId.toString() : "0";

      setMintedResult({
        tokenId,
        uri: metadataUri,
        hash,
        imageUrl: previewUrl || undefined,
      });

      setStepStatus("Mint successful! 🎉");
      // Reset form
      setName("");
      setDescription("");
      setFile(null);
      if (onMintSuccess) onMintSuccess();
    } catch (err: unknown) {
      console.error("Mint error:", err);
      setErrorMsg((err as Error).message || "An error occurred during minting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nominal mint value in USD at live ETH price (e.g. 0.01 ETH)
  const nominalEth = 0.01;
  const nominalUsd = ethPrice ? (nominalEth * ethPrice).toFixed(2) : null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
        <div>
          <h2 className="text-lg font-bold text-black flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-600"></span>
            Mint to IPFS & On-Chain
          </h2>
          <p className="text-xs text-neutral-500">
            Pin media to IPFS via Pinata server route, then mint an ERC-721 token on Sepolia
          </p>
        </div>
        {nominalUsd && (
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-neutral-500">Base valuation:</span>
            <p className="text-xs font-semibold text-blue-700">
              0.01 ETH (~${nominalUsd})
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleMint} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                NFT Artwork / Image <span className="text-blue-600">*</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="w-full text-xs text-neutral-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                NFT Title / Name <span className="text-blue-600">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Cyber Genesis #1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                required
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-black placeholder-neutral-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Description
              </label>
              <textarea
                placeholder="A brief story or description of this digital artifact..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-black placeholder-neutral-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition resize-none"
              />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 rounded-lg p-4 bg-neutral-50/50">
            {previewUrl ? (
              <div className="space-y-2 text-center w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-48 mx-auto rounded-lg object-contain shadow-sm border border-neutral-200"
                />
                <p className="text-[11px] text-neutral-500 font-medium">Ready for Pinata IPFS</p>
              </div>
            ) : (
              <div className="text-center py-6 text-neutral-400">
                <div className="mx-auto h-12 w-12 text-blue-300 mb-2">🖼️</div>
                <p className="text-xs font-medium text-neutral-600">Select an image to see preview</p>
                <p className="text-[11px] text-neutral-400">PNG, JPG, SVG, GIF supported</p>
              </div>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-200 break-words">
            ⚠️ {errorMsg}
          </div>
        )}

        {isSubmitting && (
          <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 border border-blue-200 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping"></span>
            <span className="font-medium">{stepStatus}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          {!isConnected ? (
            <p className="text-xs text-neutral-500 italic">
              Connect your wallet above to mint.
            </p>
          ) : (
            <p className="text-xs text-neutral-500">
              Contract: <span className="font-mono text-neutral-800">{NFT_ADDRESS.slice(0, 6)}…{NFT_ADDRESS.slice(-4)}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={!isConnected || !file || !name.trim() || isSubmitting}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {isSubmitting ? "Processing…" : "Upload to IPFS & Mint NFT"}
          </button>
        </div>
      </form>

      {mintedResult && (
        <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-900 flex items-center gap-1.5">
              <span>✅</span> Successfully Minted Token #{mintedResult.tokenId}
            </span>
            <span className="rounded bg-black px-2 py-0.5 text-[10px] font-semibold text-white">
              Sepolia
            </span>
          </div>
          <p className="text-neutral-700">
            <strong>Metadata URI:</strong>{" "}
            <code className="break-all font-mono text-[11px] text-blue-700">{mintedResult.uri}</code>
          </p>
          <div className="flex gap-4 pt-1 flex-wrap">
            <a
              href={`https://sepolia.etherscan.io/tx/${mintedResult.hash}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline hover:text-blue-800 font-medium"
            >
              View Transaction on Etherscan ↗
            </a>
            <a
              href={ipfsToHttp(mintedResult.uri)}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline hover:text-blue-800 font-medium"
            >
              View IPFS Metadata ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
