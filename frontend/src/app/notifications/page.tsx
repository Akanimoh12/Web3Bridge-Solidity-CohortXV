"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseAbiItem } from "viem";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { NFT_ADDRESS, nftAbi } from "@/contracts/nft";
import { Who } from "@/components/Who";

const HISTORY_WINDOW = 3000n;
const RPC_CHUNK = 500n;

const mintedEvent = parseAbiItem(
  "event Minted(address indexed to, uint256 indexed tokenId, string uri)"
);

type MintLog = {
  args?: {
    to?: `0x${string}`;
    tokenId?: bigint;
  };
  transactionHash: `0x${string}` | null;
  blockNumber: bigint | null;
  logIndex: number | null;
};

type Activity = {
  id: string;
  tokenId: string;
  recipient: `0x${string}`;
  txHash: `0x${string}`;
  blockNumber: bigint;
  logIndex: number;
};

function toActivity(log: MintLog): Activity | null {
  const recipient = log.args?.to;
  const tokenId = log.args?.tokenId;

  if (
    !recipient ||
    tokenId === undefined ||
    !log.transactionHash ||
    log.blockNumber === null ||
    log.logIndex === null
  ) {
    return null;
  }

  return {
    id: `${log.transactionHash}-${log.logIndex}`,
    tokenId: tokenId.toString(),
    recipient,
    txHash: log.transactionHash,
    blockNumber: log.blockNumber,
    logIndex: log.logIndex,
  };
}

function mergeActivities(
  previous: Activity[],
  incoming: Activity[]
): Activity[] {
  const unique = new Map<string, Activity>();

  for (const event of previous) unique.set(event.id, event);
  for (const event of incoming) unique.set(event.id, event);

  return Array.from(unique.values()).sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return a.blockNumber > b.blockNumber ? -1 : 1;
    }
    return b.logIndex - a.logIndex;
  });
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function NotificationsPage() {
  const sepoliaClient = usePublicClient({
    chainId: sepolia.id,
  });

  const mainnetClient = usePublicClient({
    chainId: mainnet.id,
  });

  const [activities, setActivities] = useState<Activity[]>([]);
  const [listening, setListening] = useState(true);
  const [watchReady, setWatchReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [olderBefore, setOlderBefore] = useState<bigint | null>(null);
  const [error, setError] = useState("");
  const [permission, setPermission] = useState("checking");
  const [retryKey, setRetryKey] = useState(0);

  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission);
    }
  }, []);

  const fetchHistory = useCallback(
    async (from: bigint, to: bigint): Promise<Activity[]> => {
      if (!sepoliaClient) {
        throw new Error("Sepolia RPC unavailable.");
      }

      const results: Activity[] = [];

      for (
        let start = from;
        start <= to;
        start += RPC_CHUNK
      ) {
        const end =
          start + RPC_CHUNK - 1n > to
            ? to
            : start + RPC_CHUNK - 1n;

        const logs = await sepoliaClient.getLogs({
          address: NFT_ADDRESS,
          event: mintedEvent,
          fromBlock: start,
          toBlock: end,
        });

        for (const log of logs) {
          const activity = toActivity(log);
          if (activity) results.push(activity);
        }
      }

      return results;
    },
    [sepoliaClient]
  );

  // Reload previous events from the blockchain on every page visit.
  useEffect(() => {
    if (!sepoliaClient) return;

    let cancelled = false;

    async function loadInitialHistory() {
      setLoading(true);
      setWatchReady(false);
      setError("");

      try {
        const latest = await sepoliaClient!.getBlockNumber();

        const from =
          latest >= HISTORY_WINDOW
            ? latest - HISTORY_WINDOW + 1n
            : 0n;

        const history = await fetchHistory(from, latest);

        if (cancelled) return;

        for (const event of history) {
          seen.current.add(event.id);
        }

        setActivities((previous) =>
          mergeActivities(previous, history)
        );

        setOlderBefore(from > 0n ? from - 1n : null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load blockchain history."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setWatchReady(true);
        }
      }
    }

    void loadInitialHistory();

    return () => {
      cancelled = true;
    };
  }, [sepoliaClient, fetchHistory, retryKey]);

  async function loadOlder() {
    if (olderBefore === null || loading) return;

    setLoading(true);
    setError("");

    try {
      const end = olderBefore;
      const from =
        end >= HISTORY_WINDOW
          ? end - HISTORY_WINDOW + 1n
          : 0n;

      const history = await fetchHistory(from, end);

      for (const event of history) {
        seen.current.add(event.id);
      }

      setActivities((previous) =>
        mergeActivities(previous, history)
      );

      setOlderBefore(from > 0n ? from - 1n : null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load older events."
      );
    } finally {
      setLoading(false);
    }
  }

  // Only events detected by this live watcher produce popups.
  useWatchContractEvent({
    address: NFT_ADDRESS,
    abi: nftAbi,
    eventName: "Minted",
    chainId: sepolia.id,
    enabled: listening && watchReady,
    poll: true,
    pollingInterval: 8_000,

    onLogs(logs) {
      const fresh: Activity[] = [];

      for (const log of logs) {
        const activity = toActivity(log);
        if (!activity || seen.current.has(activity.id)) {
          continue;
        }

        seen.current.add(activity.id);
        fresh.push(activity);

        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          void (async () => {
            let recipientName = shortAddress(
              activity.recipient
            );

            try {
              const name = await mainnetClient?.getEnsName({
                address: activity.recipient,
              });

              if (name) recipientName = name;
            } catch {
              // Use the wallet address when ENS is unavailable.
            }

            try {
              new Notification(
                `BridgeID: NFT #${activity.tokenId} minted`,
                {
                  body: `Recipient: ${recipientName}`,
                  tag: activity.id,
                }
              );
            } catch {
              // The page still shows the onchain event.
            }
          })();
        }
      }

      if (fresh.length > 0) {
        setActivities((previous) =>
          mergeActivities(previous, fresh)
        );
      }
    },
  });

  async function allowNotifications() {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch {
      setPermission("unsupported");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12 text-white">
      <header className="space-y-3">
        <p className="text-sm font-medium text-violet-400">
          BRIDGEID / ACTIVITY
        </p>

        <h1 className="text-3xl font-bold sm:text-4xl">
          Onchain activity
        </h1>

        <p className="max-w-2xl text-neutral-400">
          Explore previous NFT mints and watch new
          activity as it happens on Ethereum Sepolia.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-[#171b25] p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              Contract monitor
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              {listening && watchReady
                ? "Live event monitoring active"
                : listening
                  ? "Preparing live event monitoring"
                  : "Live monitoring paused"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setListening((value) => !value)}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
          >
            {listening ? "Pause live alerts" : "Resume live alerts"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-black/20 p-4">
            <p className="text-xs text-neutral-500">
              Network
            </p>
            <p className="mt-2 font-medium">Sepolia</p>
          </div>

          <div className="rounded-xl bg-black/20 p-4">
            <p className="text-xs text-neutral-500">
              Events loaded
            </p>
            <p className="mt-2 font-medium">
              {activities.length}
            </p>
          </div>

          <div className="rounded-xl bg-black/20 p-4">
            <p className="text-xs text-neutral-500">
              Event source
            </p>
            <p className="mt-2 font-medium">
              ClassNFT
            </p>
          </div>
        </div>

        <p className="mt-4 break-all text-xs text-neutral-500">
          Contract: {NFT_ADDRESS}
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#171b25] p-5 sm:p-7">
        <h2 className="text-lg font-semibold">
          Browser notifications
        </h2>

        <p className="mt-2 text-sm text-neutral-400">
          Historical events are displayed silently.
          New mint events can trigger a browser popup
          while this page is open.
        </p>

        {permission === "granted" ? (
          <p className="mt-3 text-sm text-emerald-400">
            Notifications enabled
          </p>
        ) : permission === "denied" ? (
          <p className="mt-3 text-sm text-amber-300">
            Notifications are blocked. Enable them
            in your browser&apos;s site settings.
          </p>
        ) : permission === "unsupported" ? (
          <p className="mt-3 text-sm text-amber-300">
            Browser notifications are unavailable.
          </p>
        ) : (
          <button
            type="button"
            onClick={allowNotifications}
            className="mt-4 rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium hover:bg-violet-500"
          >
            Allow notifications
          </button>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">
              Mint history
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              Retrieved from blockchain event logs.
              Newest events appear first.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRetryKey((value) => value + 1)}
            disabled={loading}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm disabled:opacity-40"
          >
            Refresh history
          </button>
        </div>

        {loading && (
          <p role="status" className="text-sm text-neutral-400">
            Loading blockchain events...
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="break-words rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        {activities.length === 0 && !loading && (
          <div className="rounded-2xl border border-dashed border-white/20 p-8 text-center">
            <p className="font-medium">
              No mint events found in the loaded range
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              Try loading older blocks or wait for a new mint.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {activities.map((activity) => (
            <article
              key={activity.id}
              className="rounded-2xl border border-white/10 bg-[#171b25] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="font-semibold">
                    NFT #{activity.tokenId} minted
                  </p>

                  <p className="text-sm text-neutral-300">
                    Recipient:{" "}
                    <Who address={activity.recipient} />
                  </p>

                  <p className="text-xs text-neutral-500">
                    Block {activity.blockNumber.toString()}
                  </p>
                </div>

                <div className="flex flex-col gap-2 text-sm">
                  <a
                    href={`https://sepolia.etherscan.io/tx/${activity.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-300 underline"
                  >
                    View transaction
                  </a>

                  <a
                    href="/nft"
                    className="text-neutral-300 underline"
                  >
                    NFT Studio
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        {olderBefore !== null && (
          <button
            type="button"
            onClick={loadOlder}
            disabled={loading}
            className="w-full rounded-xl border border-white/20 px-5 py-3 text-sm font-medium hover:bg-white/10 disabled:opacity-40"
          >
            {loading ? "Loading..." : "Load older activity"}
          </button>
        )}

        {olderBefore === null && !loading && !error && (
          <p className="text-center text-xs text-neutral-500">
            Reached the beginning of the chain history.
          </p>
        )}
      </section>

      <p className="text-xs leading-6 text-neutral-500">
        Blockchain events remain available after this
        page closes. The app retrieves them again when
        reopened. Browser popups only work while the
        live listener is active.
      </p>
    </div>
  );
}
