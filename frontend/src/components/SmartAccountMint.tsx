"use client";

import { useEffect, useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import {
  Zap,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
  AlertCircle
} from "lucide-react";
import { uploadNft } from "@/lib/ipfs";
import { getSmartAccountForWallet, sendBatchMintUserOp, ENTRY_POINT_07 } from "@/lib/smartAccount";

interface SmartAccountMintProps {
  onMintSuccess?: () => void;
}

export function SmartAccountMint({ onMintSuccess }: SmartAccountMintProps) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);

  // Form states for 2 NFTs in batch
  const [name1, setName1] = useState("Cosmic Voyager #1");
  const [desc1, setDesc1] = useState("First edition in our sponsored smart account batch.");
  const [file1, setFile1] = useState<File | null>(null);
  const [preview1, setPreview1] = useState<string | null>(null);

  const [name2, setName2] = useState("Cosmic Voyager #2");
  const [desc2, setDesc2] = useState("Second edition bundled into the same UserOperation.");
  const [file2, setFile2] = useState<File | null>(null);
  const [preview2, setPreview2] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepStatus, setStepStatus] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [result, setResult] = useState<{
    userOpHash: string;
    txHash: string;
    smartAccountAddress: string;
    paymaster?: string;
    tokenIds: string[];
  } | null>(null);

  // Derive Smart Account address when walletClient is ready
  useEffect(() => {
    let active = true;
    if (!walletClient) {
      setSmartAccountAddress(null);
      return;
    }

    setIsLoadingAccount(true);
    getSmartAccountForWallet(walletClient)
      .then((account) => {
        if (active) {
          setSmartAccountAddress(account.address);
          setIsLoadingAccount(false);
        }
      })
      .catch((err) => {
        console.warn("Could not compute smart account:", err);
        if (active) setIsLoadingAccount(false);
      });

    return () => {
      active = false;
    };
  }, [walletClient]);

  const handleFileChange1 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFile1(file);
    if (file) setPreview1(URL.createObjectURL(file));
  };

  const handleFileChange2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFile2(file);
    if (file) setPreview2(URL.createObjectURL(file));
  };

  const handleBatchMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletClient || !file1) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setResult(null);

    try {
      // 1. Upload media 1 to IPFS
      setStepStatus("1/4 Uploading first NFT artwork to IPFS via Pinata…");
      const uri1 = await uploadNft(file1, name1.trim(), desc1.trim());

      // 2. Upload media 2 to IPFS (use file2 if provided, or file1)
      setStepStatus("2/4 Uploading second NFT artwork to IPFS via Pinata…");
      const targetFile2 = file2 || file1;
      const uri2 = await uploadNft(targetFile2, name2.trim(), desc2.trim());

      // 3. Send single bundled UserOperation
      setStepStatus("3/4 Signing ERC-4337 UserOperation (Bundles 2 calls in 1 op)…");
      const res = await sendBatchMintUserOp({
        walletClient,
        uri1,
        uri2,
      });

      setStepStatus("4/4 Waiting for Bundler & EntryPoint confirmation…");
      setResult(res);
      setStepStatus("Batch UserOp Confirmed!");

      if (onMintSuccess) onMintSuccess();
    } catch (err: unknown) {
      console.error("Batch mint error:", err);
      setErrorMsg((err as Error).message || "Smart account UserOperation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-[0_4px_25px_rgb(0,0,0,0.03)]">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-100 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 mb-2 border border-blue-200/60">
            <Zap className="h-3.5 w-3.5 text-blue-600" />
            <span>Pimlico ERC-4337 · Gasless Batching</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900">
            Smart Account Batch Mint
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Bundle two distinct <code className="text-blue-600 font-bold">mint()</code> calls into a single atomic UserOperation sponsored by Pimlico Paymaster.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/60 px-4 py-2.5 text-right self-start sm:self-auto">
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 block">
            Gas Sponsorship
          </span>
          <span className="text-xs font-extrabold text-neutral-900 flex items-center gap-1 justify-end">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <span>100% Free (0 ETH Gas)</span>
          </span>
        </div>
      </div>

      {/* Account Info Pill */}
      {isConnected && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-3">
            <span className="text-[10px] font-bold uppercase text-neutral-400 block">
              Signer (Connected EOA)
            </span>
            <span className="font-mono text-neutral-700 truncate block mt-0.5" title={address}>
              {address}
            </span>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-3">
            <span className="text-[10px] font-bold uppercase text-blue-600 block flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
              Smart Account Address (ERC-4337)
            </span>
            <span className="font-mono font-bold text-blue-900 truncate block mt-0.5">
              {isLoadingAccount
                ? "Calculating address on Sepolia…"
                : smartAccountAddress || "Connect wallet to generate"}
            </span>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleBatchMint} className="mt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* NFT 1 */}
          <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50/30 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-white text-[10px]">
                  1
                </span>
                First NFT in Batch
              </span>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                Call 1: mint()
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                Image Artwork <span className="text-blue-600">*</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange1}
                disabled={isSubmitting}
                className="w-full text-xs text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[11px] file:font-bold file:bg-black file:text-white file:cursor-pointer cursor-pointer border border-neutral-200 rounded-xl p-1.5 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                Title <span className="text-blue-600">*</span>
              </label>
              <input
                type="text"
                value={name1}
                onChange={(e) => setName1(e.target.value)}
                disabled={isSubmitting}
                required
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Description</label>
              <textarea
                value={desc1}
                onChange={(e) => setDesc1(e.target.value)}
                disabled={isSubmitting}
                rows={2}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-blue-600 focus:outline-hidden resize-none"
              />
            </div>

            {preview1 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview1}
                alt="Preview 1"
                className="h-28 mx-auto rounded-lg object-contain border border-neutral-200 bg-white"
              />
            )}
          </div>

          {/* NFT 2 */}
          <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50/30 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px]">
                  2
                </span>
                Second NFT in Batch
              </span>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                Call 2: mint()
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                Image Artwork (optional, defaults to #1)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange2}
                disabled={isSubmitting}
                className="w-full text-xs text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[11px] file:font-bold file:bg-blue-600 file:text-white file:cursor-pointer cursor-pointer border border-neutral-200 rounded-xl p-1.5 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                Title <span className="text-blue-600">*</span>
              </label>
              <input
                type="text"
                value={name2}
                onChange={(e) => setName2(e.target.value)}
                disabled={isSubmitting}
                required
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Description</label>
              <textarea
                value={desc2}
                onChange={(e) => setDesc2(e.target.value)}
                disabled={isSubmitting}
                rows={2}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-blue-600 focus:outline-hidden resize-none"
              />
            </div>

            {preview2 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview2}
                alt="Preview 2"
                className="h-28 mx-auto rounded-lg object-contain border border-neutral-200 bg-white"
              />
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-red-50 p-3.5 text-xs text-red-600 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span className="break-all">{errorMsg}</span>
          </div>
        )}

        {isSubmitting && (
          <div className="rounded-2xl bg-blue-50 p-4 text-xs text-blue-700 border border-blue-200 flex items-center gap-3 shadow-2xs">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-ping"></span>
            <span className="font-semibold">{stepStatus}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs text-neutral-500">
            <span>EntryPoint v0.7: </span>
            <code className="font-mono text-neutral-700">{ENTRY_POINT_07.slice(0, 6)}…{ENTRY_POINT_07.slice(-4)}</code>
          </div>

          <button
            type="submit"
            disabled={!isConnected || !file1 || isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer group"
          >
            <Zap className="h-3.5 w-3.5 text-white" />
            <span>{isSubmitting ? "Executing UserOp…" : "Send Gasless Batch (2-in-1 UserOp)"}</span>
            <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </button>
        </div>
      </form>

      {/* Success Receipt */}
      {result && (
        <div className="mt-8 rounded-3xl border border-green-200 bg-green-50/40 p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-extrabold text-green-900 flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>UserOperation Executed Successfully!</span>
            </span>
            <span className="rounded-full bg-green-600 px-3 py-1 text-[11px] font-bold text-white">
              Gas Sponsored: 100%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-white p-3 border border-green-200">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                UserOp Hash
              </span>
              <a
                href={`https://jiffyscan.xyz/userOpHash/${result.userOpHash}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[11px] text-blue-600 hover:underline break-all block mt-1"
              >
                {result.userOpHash}
              </a>
            </div>

            <div className="rounded-xl bg-white p-3 border border-green-200">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                On-Chain Transaction
              </span>
              <a
                href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[11px] text-blue-600 hover:underline break-all block mt-1"
              >
                {result.txHash}
              </a>
            </div>
          </div>

          {result.tokenIds.length > 0 && (
            <div className="text-xs text-neutral-700">
              <strong>Minted Token IDs:</strong>{" "}
              {result.tokenIds.map((id) => (
                <span
                  key={id}
                  className="inline-block ml-1 bg-black text-white rounded-md px-2 py-0.5 font-mono text-[11px]"
                >
                  #{id}
                </span>
              ))}
            </div>
          )}

          <div className="pt-2 flex gap-3 flex-wrap">
            <a
              href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-neutral-800 border border-neutral-300 hover:border-black shadow-2xs transition"
            >
              <span>View On-Chain Receipt on Etherscan</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>

            <a
              href={`https://jiffyscan.xyz/userOpHash/${result.userOpHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-2xs transition"
            >
              <span>Inspect on JiffyScan</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
