"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useWatchContractEvent, usePublicClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import {
  Bell,
  BellRing,
  Radio,
  ArrowUpRight,
  ExternalLink,
  CheckCircle2,
  Volume2,
  VolumeX
} from "lucide-react";
import { NFT_ADDRESS, nftAbi, ipfsToHttp } from "@/contracts/nft";
import { EnsAddress } from "./EnsAddress";

interface MintEventItem {
  id: string;
  to: string;
  tokenId: string;
  uri: string;
  blockNumber: bigint;
  txHash: string;
  timestamp: Date;
  isRealTime?: boolean;
}

export function LiveAlertFeed() {
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const [events, setEvents] = useState<MintEventItem[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeToast, setActiveToast] = useState<MintEventItem | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Request browser notification permission
  const requestPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === "granted") {
          new Notification("🔔 Mint Alerts Enabled", {
            body: "You will receive pop-up alerts whenever an NFT is minted on Sepolia!",
            icon: "/favicon.ico",
          });
        }
      } catch (e) {
        console.warn("Could not request notification permission:", e);
      }
    }
  };

  // Play subtle audio beep on live event
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Audio autoplay policy
    }
  }, [soundEnabled]);

  // Trigger browser popup and in-app alert
  const triggerNotification = useCallback((item: MintEventItem) => {
    // 1. Web Notification API popup
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(`🎉 New Mint: Token #${item.tokenId}`, {
          body: `Minted on Sepolia by ${item.to.slice(0, 6)}…${item.to.slice(-4)}`,
          icon: "/favicon.ico",
        });
      } catch (err) {
        console.warn("Browser notification error:", err);
      }
    }

    // 2. Play sound
    playAlertSound();

    // 3. In-app top toast
    setActiveToast(item);
    setTimeout(() => {
      setActiveToast((curr) => (curr?.id === item.id ? null : curr));
    }, 6000);
  }, [playAlertSound]);

  // Load recent historical events on mount
  useEffect(() => {
    let active = true;
    if (!publicClient) return;

    publicClient
      .getContractEvents({
        address: NFT_ADDRESS,
        abi: nftAbi,
        eventName: "Minted",
        fromBlock: BigInt(11926000), // From deployment block area
      })
      .then((logs) => {
        if (!active) return;
        type MintLog = {
          transactionHash: `0x${string}`;
          logIndex: number | null;
          blockNumber: bigint;
          args: { to: string; tokenId: bigint; uri: string };
        };
        const formatted: MintEventItem[] = (logs as unknown as MintLog[]).map((log, idx) => ({
          id: `${log.transactionHash}-${log.logIndex ?? idx}`,
          to: log.args.to,
          tokenId: log.args.tokenId.toString(),
          uri: log.args.uri,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
          timestamp: new Date(),
          isRealTime: false,
        }));
        // Reverse chronological order
        setEvents(formatted.reverse());
      })
      .catch((err) => {
        console.warn("Could not load historical events:", err);
      });

    return () => {
      active = false;
    };
  }, [publicClient]);

  // Real-time contract event watcher
  useWatchContractEvent({
    address: NFT_ADDRESS,
    abi: nftAbi,
    eventName: "Minted",
    chainId: sepolia.id,
    onLogs(logs) {
      type MintLog = {
        transactionHash: `0x${string}`;
        logIndex: number | null;
        blockNumber: bigint;
        args: { to: string; tokenId: bigint; uri: string };
      };
      (logs as unknown as MintLog[]).forEach((log) => {
        const newItem: MintEventItem = {
          id: `${log.transactionHash}-${log.logIndex}-${Date.now()}`,
          to: log.args.to,
          tokenId: log.args.tokenId.toString(),
          uri: log.args.uri,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
          timestamp: new Date(),
          isRealTime: true,
        };

        setEvents((prev) => [newItem, ...prev]);
        triggerNotification(newItem);
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Floating In-App Live Alert Toast */}
      {activeToast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm rounded-2xl border border-blue-400 bg-white/95 p-4 shadow-2xl backdrop-blur-md animate-bounce" style={{ animationIterationCount: 2 }}>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
              <BellRing className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-neutral-900 text-xs">
                  🎉 Real-Time Mint Event!
                </span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  #{activeToast.tokenId}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-neutral-600">
                <span>Minter: </span>
                <EnsAddress address={activeToast.to} />
              </div>
              <a
                href={`https://sepolia.etherscan.io/tx/${activeToast.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline"
              >
                <span>View on Etherscan</span>
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Control Banner Card */}
      <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-[0_4px_25px_rgb(0,0,0,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 mb-2 border border-blue-200/60">
              <Radio className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
              <span>Real-Time WebSocket Listener</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900">
              Live Contract Event Alerts
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Listening live to <code className="font-mono text-neutral-800">Minted(address to, uint256 tokenId, string uri)</code> on Sepolia.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-700 hover:border-neutral-400 transition cursor-pointer"
              title="Toggle audio alert sound"
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-blue-600" /> : <VolumeX className="h-3.5 w-3.5 text-neutral-400" />}
              <span className="text-[11px] hidden sm:inline">{soundEnabled ? "Sound On" : "Muted"}</span>
            </button>

            {/* Notification Permission Button */}
            {notificationPermission === "granted" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3.5 py-2 text-xs font-bold text-green-700 border border-green-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span>Pop-ups Active</span>
              </span>
            ) : notificationPermission === "denied" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3.5 py-2 text-xs font-medium text-red-600 border border-red-200">
                <span>Pop-ups Blocked in Browser</span>
              </span>
            ) : (
              <button
                onClick={requestPermission}
                className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-neutral-800 transition cursor-pointer"
              >
                <Bell className="h-3.5 w-3.5 text-blue-400" />
                <span>Enable Browser Pop-ups</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Radar Strip */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
            </span>
            <span className="font-semibold text-neutral-800">
              Contract Listener Connected
            </span>
            <span className="text-neutral-400">({events.length} events indexed)</span>
          </div>

          <div className="text-[11px] text-neutral-500 flex items-center gap-2">
            <span>Contract: </span>
            <a
              href={`https://sepolia.etherscan.io/address/${NFT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-blue-600 hover:underline"
            >
              {NFT_ADDRESS.slice(0, 6)}…{NFT_ADDRESS.slice(-4)}
            </a>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 px-1">
          Recent Event Stream
        </h3>

        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((ev) => (
              <div
                key={ev.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 transition-all duration-300 ${
                  ev.isRealTime
                    ? "border-blue-400 bg-blue-50/50 shadow-md ring-1 ring-blue-400"
                    : "border-neutral-200/90 bg-white hover:border-blue-300 shadow-2xs"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-white font-extrabold text-sm shadow-xs">
                    #{ev.tokenId}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-neutral-900 text-sm">
                        ClassNFT Minted
                      </span>
                      {ev.isRealTime && (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs animate-pulse">
                          LIVE NOW
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-neutral-600 flex-wrap">
                      <span className="text-neutral-400">Minter:</span>
                      <EnsAddress address={ev.to} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-100 text-xs">
                  {ev.uri && (
                    <a
                      href={ipfsToHttp(ev.uri)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline text-[11px]"
                    >
                      <span>IPFS URI</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  <a
                    href={`https://sepolia.etherscan.io/tx/${ev.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 font-medium text-neutral-700 hover:border-black hover:text-black transition text-[11px]"
                  >
                    <span>Tx: {ev.txHash.slice(0, 6)}…{ev.txHash.slice(-4)}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-neutral-200 bg-white p-12 text-center shadow-[0_4px_25px_rgb(0,0,0,0.02)]">
            <Radio className="mx-auto h-8 w-8 text-neutral-300 animate-pulse mb-2" />
            <p className="text-sm font-bold text-neutral-700">Waiting for live events</p>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              Any new NFT minted on Sepolia will trigger a live sound and browser pop-up alert here immediately.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
