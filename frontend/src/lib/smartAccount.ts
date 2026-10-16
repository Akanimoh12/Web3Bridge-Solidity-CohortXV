import { createPublicClient, http, encodeFunctionData, parseEventLogs, Address } from "viem";
import { sepolia } from "viem/chains";
import { entryPoint07Address } from "viem/account-abstraction";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createSmartAccountClient, toOwner } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { NFT_ADDRESS, nftAbi } from "@/contracts/nft";

export const ENTRY_POINT_07 = entryPoint07Address;

export function getPublicClient() {
  return createPublicClient({
    chain: sepolia,
    transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"),
  });
}

export function getPimlicoClient() {
  // Uses our Next.js secure server proxy route /api/pimlico to keep PIMLICO_API_KEY secret
  return createPimlicoClient({
    transport: http("/api/pimlico"),
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });
}

// Computes or retrieves the deterministic ERC-4337 Smart Account for any connected EOA wallet
export async function getSmartAccountForWallet(
  walletClient: Parameters<typeof toOwner>[0]["owner"]
) {
  const publicClient = getPublicClient();
  const owner = await toOwner({ owner: walletClient });

  const account = await toSimpleSmartAccount({
    client: publicClient,
    owner,
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });

  return account;
}

// Prepares and sends a 2-call batch UserOperation via Pimlico Paymaster
export async function sendBatchMintUserOp({
  walletClient,
  uri1,
  uri2,
}: {
  walletClient: Parameters<typeof toOwner>[0]["owner"];
  uri1: string;
  uri2: string;
}) {
  const account = await getSmartAccountForWallet(walletClient);
  const pimlicoClient = getPimlicoClient();

  const smartAccountClient = createSmartAccountClient({
    account,
    chain: sepolia,
    bundlerTransport: http("/api/pimlico"),
    paymaster: pimlicoClient,
    userOperation: {
      estimateFeesPerGas: async () => {
        const gasPrice = await pimlicoClient.getUserOperationGasPrice();
        return gasPrice.fast;
      },
    },
  });

  const call1 = {
    to: NFT_ADDRESS as Address,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: nftAbi,
      functionName: "mint",
      args: [uri1],
    }),
  };

  const call2 = {
    to: NFT_ADDRESS as Address,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: nftAbi,
      functionName: "mint",
      args: [uri2],
    }),
  };

  // Sends the single UserOperation bundling call 1 and call 2 atomically
  const userOpHash = await smartAccountClient.sendUserOperation({
    calls: [call1, call2],
  });

  const receipt = await smartAccountClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });

  // Extract minted token IDs from transaction logs
  let tokenIds: string[] = [];
  try {
    const logs = parseEventLogs({
      abi: nftAbi,
      logs: receipt.receipt.logs,
      eventName: "Minted",
    });
    tokenIds = logs.map((l) => (l.args as { tokenId: bigint }).tokenId.toString());
  } catch (e) {
    console.warn("Could not parse minted logs:", e);
  }

  return {
    userOpHash,
    txHash: receipt.receipt.transactionHash,
    smartAccountAddress: account.address,
    paymaster: receipt.paymaster,
    tokenIds,
  };
}
