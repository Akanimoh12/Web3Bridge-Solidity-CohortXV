"use client";

import { useState } from "react";
import { parseEventLogs } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { ImagePlus, AlertCircle, CheckCircle2, ArrowUpRight, Sparkles, UploadCloud } from "lucide-react";
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

      setStepStatus("Mint successful!");
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
    <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-[0_4px_25px_rgb(0,0,0,0.03)]">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-100 gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 mb-1.5 border border-blue-200/60">
            <Sparkles className="h-3 w-3" />
            <span>ERC-721URIStorage</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900">
            Mint IPFS Artwork On-Chain
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Decentralized storage via Pinata Files API with instant Sepolia minting.
          </p>
        </div>

        {nominalUsd && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-2 text-right self-start sm:self-auto">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 block">
              Base Oracle Valuation
            </span>
            <span className="text-xs font-extrabold text-neutral-900">
              0.01 ETH <span className="text-blue-700 font-semibold">(~${nominalUsd})</span>
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleMint} className="mt-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left inputs */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                Artwork File <span className="text-blue-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  className="w-full text-xs text-neutral-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-black file:text-white hover:file:bg-neutral-800 file:cursor-pointer cursor-pointer border border-neutral-200/90 rounded-2xl p-2 bg-neutral-50/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                NFT Name / Title <span className="text-blue-600">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Lagos Genesis #01"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                required
                className="w-full rounded-2xl border border-neutral-200/90 bg-neutral-50/30 px-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-blue-600 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                Description
              </label>
              <textarea
                placeholder="A short story or background about this digital creation..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                className="w-full rounded-2xl border border-neutral-200/90 bg-neutral-50/30 px-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-blue-600 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition resize-none"
              />
            </div>
          </div>

          {/* Right upload preview */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 p-4 transition hover:border-blue-300">
            {previewUrl ? (
              <div className="space-y-2 text-center w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-52 mx-auto rounded-xl object-contain shadow-xs border border-neutral-200 bg-white"
                />
                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 border border-blue-200/60">
                  <UploadCloud className="h-3.5 w-3.5 text-blue-600" />
                  <span>Ready for Pinata IPFS</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-400">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-3">
                  <ImagePlus className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-neutral-700">Preview Canvas</p>
                <p className="text-[11px] text-neutral-400 mt-1">Select an image to see live preview</p>
                <span className="inline-block mt-3 text-[10px] font-medium text-neutral-400 bg-neutral-100 rounded-full px-2.5 py-0.5">
                  PNG · JPG · SVG · GIF
                </span>
              </div>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-red-50 p-3.5 text-xs text-red-600 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSubmitting && (
          <div className="rounded-2xl bg-blue-50 p-3.5 text-xs text-blue-700 border border-blue-200 flex items-center gap-2.5 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping"></span>
            <span className="font-semibold">{stepStatus}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {!isConnected ? (
            <p className="text-xs text-neutral-500">
              ⚡ Connect your wallet in the top bar to start minting.
            </p>
          ) : (
            <p className="text-xs text-neutral-500">
              Sepolia Contract:{" "}
              <span className="font-mono font-semibold text-neutral-800">
                {NFT_ADDRESS.slice(0, 6)}…{NFT_ADDRESS.slice(-4)}
              </span>
            </p>
          )}

          <button
            type="submit"
            disabled={!isConnected || !file || !name.trim() || isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-xs font-bold text-white shadow-xs hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer group"
          >
            <span>{isSubmitting ? "Processing Transaction…" : "Pin to IPFS & Mint NFT"}</span>
            <ArrowUpRight className="h-4 w-4 text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </button>
        </div>
      </form>

      {mintedResult && (
        <div className="mt-8 rounded-3xl border border-blue-200/80 bg-blue-50/40 p-6 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-extrabold text-blue-900 flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>Mint Confirmed — Token #{mintedResult.tokenId}</span>
            </span>
            <span className="rounded-full bg-black px-3 py-1 text-[11px] font-bold text-white">
              Sepolia Block
            </span>
          </div>
          <p className="text-xs text-neutral-700">
            <strong>Metadata URI:</strong>{" "}
            <code className="break-all font-mono text-[11px] text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-100">
              {mintedResult.uri}
            </code>
          </p>
          <div className="flex gap-4 pt-2 flex-wrap">
            <a
              href={`https://sepolia.etherscan.io/tx/${mintedResult.hash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 hover:border-blue-400 shadow-2xs transition"
            >
              <span>View on Etherscan</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <a
              href={ipfsToHttp(mintedResult.uri)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 hover:border-blue-400 shadow-2xs transition"
            >
              <span>View IPFS JSON</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
