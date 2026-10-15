"use client";

import { useState } from "react";
import {
  useAccount,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { CLASS_NFT_ADDRESS, classNftAbi } from "@/lib/contracts";

export function MakeCard() {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!file) {
      setError("Choose a picture first");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);
      formData.append("bio", bio);
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload failed");

      writeContract({
        address: CLASS_NFT_ADDRESS,
        abi: classNftAbi,
        functionName: "mint",
        args: [data.tokenUri],
        chainId: sepolia.id,
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Something went wrong",
      );
    } finally {
      setUploading(false);
    }
  }

  if (!isConnected) return <p className="opacity-60">Connect a wallet to make your card.</p>;
  if (chainId !== sepolia.id) {
    return (
      <button className="rounded-lg bg-blue-600 px-4 py-2 w-fit" onClick={() => switchChain({ chainId: sepolia.id })}>
        Switch to Sepolia
      </button>
    );
  }

  const busy = uploading || isPending || receipt.isLoading;
  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-white/15 p-4 w-full max-w-md flex flex-col gap-3">
      <h2 className="font-semibold">Make my card</h2>
      <input className="rounded-lg bg-white/10 px-3 py-2 outline-none" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
      <textarea className="rounded-lg bg-white/10 px-3 py-2 outline-none" placeholder="Short bio" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} rows={3} />
      <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
      <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 disabled:opacity-50">
        {uploading ? "Uploading to IPFS..." : isPending ? "Confirm in your wallet..." : receipt.isLoading ? "Minting..." : "Upload and mint"}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {writeError && <p className="text-red-400 text-sm">{writeError.message.split("\n")[0]}</p>}
      {receipt.isSuccess && hash && (
        <p className="text-green-400 text-sm">
          Minted! <a className="underline" href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer">View transaction</a>
        </p>
      )}
    </form>
  );
}