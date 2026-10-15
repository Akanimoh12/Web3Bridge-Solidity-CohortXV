"use client";

import { useState } from "react";
import { useAccount, useWatchContractEvent } from "wagmi";
import { getWalletClient } from "wagmi/actions";
import { sepolia } from "wagmi/chains";
import type { PushAPI } from "@pushprotocol/restapi";
import { config } from "@/lib/wagmi";
import { NFT_ADDRESS, nftAbi } from "@/contracts/nft";
import { Who } from "@/components/Who";

// The Push channel we opt in to. Format (CAIP-10): eip155:<chainId>:<channel address>
const PUSH_CHANNEL = process.env.NEXT_PUBLIC_PUSH_CHANNEL ?? "eip155:1:0xB88460Bb2696CAb9D66013A05dFF29a28330689D";

type Alert = { tokenId: string; to: `0x${string}`; tx: string };
type PushNote = { title: string; message: string };

export default function NotificationsPage() {
  const { isConnected } = useAccount();

  // ================= PART 1: our own notifier =================
  // LISTENER: wagmi asks the chain every 4 seconds for new Minted events from ClassNFT
  const [alerts, setAlerts] = useState<Alert[]>([]);
  useWatchContractEvent({
    address: NFT_ADDRESS,
    abi: nftAbi,
    eventName: "Minted",
    chainId: sepolia.id,
    pollingInterval: 4_000,
    onLogs(logs) {
      for (const log of logs) {
        const alert = { tokenId: log.args.tokenId!.toString(), to: log.args.to!, tx: log.transactionHash! };
        setAlerts((old) => [alert, ...old]);

        // NOTIFIER: a pop-up from the browser, even if this tab is in the background
        if (Notification.permission === "granted") {
          new Notification(`NFT #${alert.tokenId} minted`, { body: `to ${alert.to}` });
        }
      }
    },
  });

  // The browser asks the user once: "allow notifications from localhost?"
  const [permission, setPermission] = useState<string>(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  async function allowPopups() {
    setPermission(await Notification.requestPermission());
  }

  // ================= PART 2: Push Protocol =================
  const [push, setPush] = useState<PushAPI | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [inbox, setInbox] = useState<PushNote[]>([]);
  const [channelNews, setChannelNews] = useState<PushNote[]>([]);
  const [pushStatus, setPushStatus] = useState("");

  async function signInToPush() {
    try {
      setPushStatus("Sign the message in your wallet…");
      const { PushAPI, CONSTANTS } = await import("@pushprotocol/restapi"); // load the SDK only when needed
      const walletClient = await getWalletClient(config);
      const user = await PushAPI.initialize(walletClient, { env: CONSTANTS.ENV.PROD });
      setPush(user);

      const subs = await user.notification.subscriptions();
      setSubscribed(subs.some((s: { channel: string }) => PUSH_CHANNEL.endsWith(s.channel)));
      await refresh(user);
      setPushStatus("Signed in to Push ✅");
    } catch (e) {
      setPushStatus(`Error: ${(e as Error).message}`);
    }
  }

  async function optIn() {
    if (!push) return;
    setPushStatus("Sign the opt-in in your wallet…");
    await push.notification.subscribe(PUSH_CHANNEL); // a signature, no gas
    setSubscribed(true);
    setPushStatus("Opted in ✅");
  }

  async function refresh(user = push) {
    if (!user) return;
    const mine = await user.notification.list("INBOX", { limit: 5 });
    setInbox(mine.map((n: PushNote) => ({ title: n.title, message: n.message })));
    const news = await user.channel.notifications(PUSH_CHANNEL, { limit: 3 });
    setChannelNews(
      news.notifications.map((n: { notification: { title: string; body: string } }) => ({
        title: n.notification.title,
        message: n.notification.body,
      })),
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Notifications</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">1. Live alerts from our NFT contract</h2>
        <p className="text-sm text-neutral-600">
          Event → listener → notifier. Keep this tab open, then mint on <b>/nft</b> or <b>/aa</b> in another tab.
        </p>
        {permission !== "granted" && permission !== "unsupported" && (
          <button className="rounded border px-3 py-1" onClick={allowPopups}>Allow pop-up notifications</button>
        )}
        {alerts.length === 0 && <p className="text-sm">Listening… no new mint yet.</p>}
        <ul className="space-y-1">
          {alerts.map((a) => (
            <li key={a.tx + a.tokenId} className="rounded border bg-white p-2 text-sm">
              🔔 NFT <b>#{a.tokenId}</b> minted to <Who address={a.to} /> ·{" "}
              <a className="underline" href={`https://sepolia.etherscan.io/tx/${a.tx}`} target="_blank">tx</a>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">2. Your wallet&apos;s inbox on Push Protocol</h2>
        {!push && (
          <button className="rounded bg-black px-3 py-1 text-white disabled:opacity-50" disabled={!isConnected} onClick={signInToPush}>
            Sign in to Push
          </button>
        )}
        {push && !subscribed && <button className="rounded border px-3 py-1" onClick={optIn}>Opt in to the channel</button>}
        {push && subscribed && <p className="text-sm">You are subscribed to {PUSH_CHANNEL}.</p>}
        {push && <button className="ml-2 rounded border px-3 py-1" onClick={() => refresh()}>Refresh</button>}
        <p className="text-sm">{pushStatus}</p>

        {push && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="font-medium">My inbox</h3>
              {inbox.length === 0 && <p className="text-sm text-neutral-500">Empty. Messages sent after you opt in arrive here.</p>}
              {inbox.map((n, i) => <p key={i} className="text-sm"><b>{n.title}</b> {n.message}</p>)}
            </div>
            <div>
              <h3 className="font-medium">The channel&apos;s latest messages</h3>
              {channelNews.map((n, i) => <p key={i} className="text-sm"><b>{n.title}</b> {n.message?.slice(0, 120)}</p>)}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
