"use client";

import { useState } from "react";
import { createPublicClient, encodeFunctionData, http } from "viem";
import { sepolia } from "viem/chains";
import { entryPoint07Address } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { useAccount, useSwitchChain } from "wagmi";
import { getWalletClient } from "wagmi/actions";
import { config } from "@/lib/wagmi";
import { NFT_ADDRESS, nftAbi } from "@/contracts/nft";

// 1. The EntryPoint: the one contract that checks and runs every UserOperation (version 0.7)
const entryPoint = { address: entryPoint07Address, version: "0.7" } as const;

// 2. A client that only READS Sepolia
const publicClient = createPublicClient({ chain: sepolia, transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL) });

// 3. The smart account, owned by the wallet you connected. Your wallet only SIGNS.
async function getSmartAccount() {
  const walletClient = await getWalletClient(config, { chainId: sepolia.id });
  return toSimpleSmartAccount({ client: publicClient, owner: walletClient, entryPoint });
}

export default function SmartAccountPage() {
  const { isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [accountAddress, setAccountAddress] = useState("");
  const [deployed, setDeployed] = useState<boolean | null>(null);
  const [uri, setUri] = useState("");
  const [two, setTwo] = useState(false);
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");

  // Step 1: work out the smart account's address. It exists BEFORE the contract is deployed.
  async function showAccount() {
    try {
      await switchChainAsync({ chainId: sepolia.id });
      const account = await getSmartAccount();
      const code = await publicClient.getCode({ address: account.address });
      setAccountAddress(account.address);
      setDeployed(Boolean(code));
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`);
    }
  }

  // Step 2: one UserOperation that mints from the smart account. The paymaster pays the gas.
  async function mintFromSmartAccount() {
    try {
      await switchChainAsync({ chainId: sepolia.id });
      const account = await getSmartAccount();

      // 4. The bundler and the paymaster, reached through OUR server route
      const bundlerUrl = `${window.location.origin}/api/bundler`;
      const pimlico = createPimlicoClient({ transport: http(bundlerUrl), entryPoint });

      // 5. The client that builds the UserOperation, asks you to sign it, and sends it to the bundler
      const smartAccountClient = createSmartAccountClient({
        account,
        chain: sepolia,
        bundlerTransport: http(bundlerUrl),
        paymaster: pimlico, // "please pay the gas for this user"
        userOperation: {
          estimateFeesPerGas: async () => (await pimlico.getUserOperationGasPrice()).fast,
        },
      });

      // 6. The calls: mint once, or twice (batching: two actions, one signature)
      const mintCall = {
        to: NFT_ADDRESS,
        data: encodeFunctionData({ abi: nftAbi, functionName: "mint", args: [uri] }),
      };
      const calls = two ? [mintCall, mintCall] : [mintCall];

      setStatus("Sign the UserOperation in your wallet…");
      const userOpHash = await smartAccountClient.sendUserOperation({ calls });

      setStatus(`Sent to the bundler. UserOp hash: ${userOpHash}. Waiting…`);
      const receipt = await smartAccountClient.waitForUserOperationReceipt({ hash: userOpHash });

      setTxHash(receipt.receipt.transactionHash);
      setDeployed(true);
      setStatus(receipt.success ? "Done ✅" : "The UserOperation was included but failed ❌");
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mint from a smart account, with no gas</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">1. Your smart account</h2>
        <button className="rounded border px-3 py-1 disabled:opacity-50" disabled={!isConnected} onClick={showAccount}>
          Show my smart account
        </button>
        {accountAddress && (
          <div className="break-all rounded border bg-white p-3 text-sm">
            <p><b>Address:</b> {accountAddress}</p>
            <p><b>Deployed yet?</b> {deployed ? "YES" : "NO — it exists only as an address until its first UserOperation"}</p>
            <a className="underline" href={`https://sepolia.etherscan.io/address/${accountAddress}`} target="_blank">
              Open it on Etherscan
            </a>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">2. Mint with it</h2>
        <input
          className="w-full rounded border px-2 py-1"
          placeholder="ipfs://… (the Token URI from the IPFS NFT page)"
          value={uri}
          onChange={(e) => setUri(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={two} onChange={(e) => setTwo(e.target.checked)} />
          Mint two in ONE UserOperation (batching)
        </label>
        <button
          className="rounded bg-black px-3 py-1 text-white disabled:opacity-50"
          disabled={!isConnected || !uri.startsWith("ipfs://")}
          onClick={mintFromSmartAccount}
        >
          Mint from my smart account
        </button>
        <p className="break-all text-sm">{status}</p>
        {txHash && (
          <a className="text-sm underline" href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank">
            See the transaction on Etherscan: who sent it, and to which contract?
          </a>
        )}
      </section>
    </div>
  );
}
