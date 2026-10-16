"use client";

import { useState } from "react";
import {
  createPublicClient,
  encodeFunctionData,
  http,
  parseEventLogs,
  isAddress,
} from "viem";
import { sepolia } from "viem/chains";
import { entryPoint07Address } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { useAccount, useSwitchChain } from "wagmi";
import { getWalletClient } from "wagmi/actions";
import { config } from "@/lib/wagmi";
import { NFT_ADDRESS, nftAbi } from "@/contracts/nft";

const entryPoint = {
  address: entryPoint07Address,
  version: "0.7",
} as const;

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
});

type BatchResult = {
  userOpHash: `0x${string}`;
  txHash: `0x${string}`;
  smartAccount: `0x${string}`;
  tokenIds: string[];
};

function validUri(uri: string) {
  return /^ipfs:\/\/[a-zA-Z0-9]+(?:\/[a-zA-Z0-9._/-]+)?$/.test(
    uri.trim()
  );
}

async function getSmartAccount() {
  const walletClient = await getWalletClient(config, {
    chainId: sepolia.id,
  });

  return toSimpleSmartAccount({
    client: publicClient,
    owner: walletClient,
    entryPoint,
  });
}

export default function SmartMintPage() {
  const { isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [accountAddress, setAccountAddress] = useState("");
  const [deployed, setDeployed] = useState<boolean | null>(null);
  const [uriA, setUriA] = useState("");
  const [uriB, setUriB] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<BatchResult | null>(null);

  async function ensureSepolia() {
    if (chainId !== sepolia.id) {
      await switchChainAsync({ chainId: sepolia.id });
    }
  }

  async function showAccount() {
    setBusy(true);
    setError("");
    setStatus("Calculating your smart account address...");

    try {
      await ensureSepolia();

      const account = await getSmartAccount();
      const code = await publicClient.getCode({
        address: account.address,
      });

      setAccountAddress(account.address);
      setDeployed(Boolean(code));
      setStatus("Smart account address ready.");
    } catch (err) {
      setStatus("");
      setError(
        err instanceof Error ? err.message : "Account lookup failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function executeBatch() {
    if (!isConnected || busy) return;

    if (!isAddress(NFT_ADDRESS)) {
      setError("The configured ClassNFT address is invalid.");
      return;
    }

    if (!validUri(uriA) || !validUri(uriB)) {
      setError("Provide two valid ipfs:// metadata URIs.");
      return;
    }

    setBusy(true);
    setError("");
    setResult(null);

    try {
      await ensureSepolia();

      setStatus("Preparing your smart account...");
      const account = await getSmartAccount();
      setAccountAddress(account.address);

      const bundlerUrl = `${window.location.origin}/api/bundler`;

      const pimlico = createPimlicoClient({
        transport: http(bundlerUrl),
        entryPoint,
      });

      const smartAccountClient = createSmartAccountClient({
        account,
        chain: sepolia,
        bundlerTransport: http(bundlerUrl),
        paymaster: pimlico,
        userOperation: {
          estimateFeesPerGas: async () =>
            (await pimlico.getUserOperationGasPrice()).fast,
        },
      });

      const calls = [uriA.trim(), uriB.trim()].map((uri) => ({
        to: NFT_ADDRESS,
        value: 0n,
        data: encodeFunctionData({
          abi: nftAbi,
          functionName: "mint",
          args: [uri],
        }),
      }));

      setStatus(
        "Requesting sponsorship. Approve one UserOperation in MetaMask..."
      );

      const userOpHash = await smartAccountClient.sendUserOperation({
        calls,
      });

      setStatus(
        "UserOperation submitted. Waiting for Sepolia confirmation..."
      );

      const operation = await smartAccountClient.waitForUserOperationReceipt({
        hash: userOpHash,
        timeout: 120_000,
      });

      const txHash = operation.receipt.transactionHash;

      const mintLogs = operation.receipt.logs.filter(
        (log) =>
          log.address.toLowerCase() === NFT_ADDRESS.toLowerCase()
      );

      const mintedEvents = parseEventLogs({
        abi: nftAbi,
        logs: mintLogs,
        eventName: "Minted",
      });

      const tokenIds = mintedEvents.map(
        (event) => event.args.tokenId.toString()
      );

      setResult({
        userOpHash,
        txHash,
        smartAccount: account.address,
        tokenIds,
      });

      const code = await publicClient.getCode({
        address: account.address,
      });
      setDeployed(Boolean(code));

      if (!operation.success) {
        setError("The UserOperation was included but execution failed.");
        setStatus("Transaction failed.");
      } else if (tokenIds.length !== 2) {
        setError(
          `Transaction succeeded, but only ${tokenIds.length} Minted events were found. Review the receipt.`
        );
        setStatus("Receipt requires investigation.");
      } else {
        setStatus(
          "Batch successful! Two NFTs minted in one UserOperation."
        );
      }
    } catch (err) {
      setStatus("");
      setError(
        err instanceof Error
          ? err.message
          : "Smart account operation failed."
      );
    } finally {
      setBusy(false);
    }
  }

  const ready =
    isConnected &&
    validUri(uriA) &&
    validUri(uriB) &&
    !busy;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12 text-white">
      <header className="space-y-3">
        <p className="text-sm font-medium text-violet-400">
          BRIDGEID / SMART MINT
        </p>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Two NFT mints. One operation.
        </h1>

        <p className="text-neutral-400">
          Use an ERC-4337 smart account to mint two NFTs
          in a single UserOperation on Ethereum Sepolia.
          Gas sponsorship is requested through Pimlico.
        </p>
      </header>

      <section className="space-y-5 rounded-2xl border border-white/10 bg-[#171b25] p-5 sm:p-7">
        <div>
          <h2 className="text-xl font-semibold">1. Smart account</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Your MetaMask wallet controls this smart account.
            Its address can be calculated before deployment.
          </p>
        </div>

        <button
          type="button"
          disabled={!isConnected || busy}
          onClick={showAccount}
          className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          Show my smart account
        </button>

        {accountAddress && (
          <div className="space-y-3 rounded-xl border border-white/10 bg-[#10131d] p-4">
            <p className="text-xs text-neutral-400">
              Calculated smart account address
            </p>

            <p className="break-all font-mono text-sm text-white">
              {accountAddress}
            </p>

            <p className="text-sm text-neutral-300">
              Deployed:{" "}
              <span className="font-medium text-violet-300">
                {deployed === null
                  ? "Checking..."
                  : deployed
                    ? "Yes"
                    : "No, awaiting first UserOperation"}
              </span>
            </p>

            <a
              href={`https://sepolia.etherscan.io/address/${accountAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-violet-300 underline"
            >
              View smart account on Etherscan
            </a>
          </div>
        )}
      </section>

      <section className="space-y-5 rounded-2xl border border-white/10 bg-[#171b25] p-5 sm:p-7">
        <div>
          <h2 className="text-xl font-semibold">2. Prepare your batch</h2>

          <p className="mt-1 text-sm text-neutral-400">
            Paste two NFT metadata URIs from IPFS.
            You can reuse the URI from NFT #0 for this test.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="uri-a" className="block text-sm font-medium">
            NFT 1 metadata URI
          </label>
          <input
            id="uri-a"
            type="text"
            value={uriA}
            onChange={(event) => setUriA(event.target.value)}
            placeholder="ipfs://bafy..."
            className="w-full rounded-xl border border-white/20 bg-[#10131d] px-4 py-3 text-sm text-white outline-none focus:border-violet-400"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="uri-b" className="block text-sm font-medium">
            NFT 2 metadata URI
          </label>
          <input
            id="uri-b"
            type="text"
            value={uriB}
            onChange={(event) => setUriB(event.target.value)}
            placeholder="ipfs://bafy..."
            className="w-full rounded-xl border border-white/20 bg-[#10131d] px-4 py-3 text-sm text-white outline-none focus:border-violet-400"
          />
        </div>

        <button
          type="button"
          onClick={() => setUriB(uriA)}
          disabled={!validUri(uriA)}
          className="text-sm text-violet-300 underline disabled:opacity-40"
        >
          Use NFT 1 metadata for both mints
        </button>

        <div className="space-y-2 rounded-xl border border-white/10 bg-[#10131d] p-4 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-neutral-400">Destination</span>
            <span>ClassNFT / Sepolia</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-neutral-400">Calls</span>
            <span>2 × mint(string)</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-neutral-400">Authorization</span>
            <span>One UserOperation</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-neutral-400">Gas</span>
            <span>Paymaster sponsorship requested</span>
          </div>
        </div>

        {!isConnected && (
          <p className="text-sm text-amber-300">
            Connect MetaMask before submitting the batch.
          </p>
        )}

        <button
          type="button"
          disabled={!ready}
          onClick={executeBatch}
          className="w-full rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Processing..." : "Sign and execute 2 NFT mints"}
        </button>

        {status && (
          <p role="status" className="break-words rounded-xl bg-violet-500/10 p-4 text-sm text-violet-200">
            {status}
          </p>
        )}

        {error && (
          <p role="alert" className="max-h-64 overflow-auto break-words rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </p>
        )}
      </section>

      {result && (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#171b25] p-5 sm:p-7">
          <h2 className="text-xl font-semibold">
            3. Onchain execution evidence
          </h2>

          <p className="break-all text-sm text-neutral-300">
            UserOperation: {result.userOpHash}
          </p>

          <p className="break-all text-sm text-neutral-300">
            Transaction: {result.txHash}
          </p>

          <p className="text-sm text-neutral-300">
            Mint events found: {result.tokenIds.length}
          </p>

          {result.tokenIds.map((id) => (
            <p key={id} className="text-sm text-white">
              Minted NFT #{id}
            </p>
          ))}

          <a
            href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-violet-300 underline"
          >
            Inspect the transaction on Etherscan
          </a>
        </section>
      )}
    </div>
  );
}
