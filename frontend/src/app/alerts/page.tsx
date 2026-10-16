"use client";

import { LiveAlertFeed } from "@/components/LiveAlertFeed";
import { Radio } from "lucide-react";

export default function AlertsPage() {
  return (
    <div className="space-y-8 pb-12">
      <div className="pt-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200/60 mb-2">
          <Radio className="h-3 w-3 text-blue-600 animate-pulse" />
          <span>Real-Time Sepolia Event Listener</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
          Live Mint Alerts & Feed
        </h1>
        <p className="text-xs text-neutral-500 mt-1 max-w-xl">
          Real-time event stream directly from the ClassNFT contract. Each mint resolves the minter to an ENS name and delivers a native browser pop-up notification.
        </p>
      </div>

      <LiveAlertFeed />
    </div>
  );
}
