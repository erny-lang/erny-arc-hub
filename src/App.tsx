import { useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import Header from "./components/Header";
import SendTab from "./components/SendTab";
import BridgeTab from "./components/BridgeTab";
import SwapTab from "./components/SwapTab";
import BalancePanel from "./components/BalancePanel";
import ActivityPanel from "./components/ActivityPanel";

type Tab = "send" | "bridge" | "swap";

const TABS: { key: Tab; label: string }[] = [
  { key: "send", label: "Send" },
  { key: "bridge", label: "Bridge" },
  { key: "swap", label: "Swap" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("send");

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />

      <main className="body-square flex-1 max-w-[1200px] w-full mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-6">
          <div className="space-y-4">
            <BalancePanel />
            <ActivityPanel />
          </div>

          <div className="card px-6 py-5">
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-xl p-[3px]" style={{ background: "#1a1a1a" }}>
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-5 py-[7px] rounded-[9px] text-[12px] font-semibold transition-all duration-150 cursor-pointer ${
                      activeTab === tab.key ? "bg-white text-black" : "text-text-3 hover:text-text-2"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div key={activeTab} className="animate-fade-in">
              {activeTab === "send" && <SendTab />}
              {activeTab === "bridge" && <BridgeTab />}
              {activeTab === "swap" && <SwapTab />}
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-[10px] text-text-3">
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-green inline-block" />
                Arc Testnet
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer
        className="h-12 border-t flex items-center justify-center px-6"
        style={{ background: "#0d3f99", borderColor: "rgba(161, 198, 255, 0.35)" }}
      >
        <div className="flex items-center gap-1 text-[10px] text-white">
          <a
            href="https://developers.circle.com/circle-wallets/doc/arc-overview"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-85 transition-opacity text-white"
          >
            Powered by Arc App Kit
          </a>
          <span>&middot;</span>
          <a
            href="https://x.com/erny_cb"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-85 transition-opacity text-white"
          >
            Created by @erny_cb
          </a>
        </div>
      </footer>
      <Analytics />
    </div>
  );
}
