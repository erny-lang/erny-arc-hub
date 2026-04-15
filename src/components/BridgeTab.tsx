import { useCallback, useEffect, useRef, useState } from "react";
import { AppKit } from "@circle-fin/app-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import { useWallet } from "../context/WalletContext";
import { BRIDGE_CHAINS } from "../lib/constants";
import Dropdown from "./Dropdown";

const CHAIN_OPTIONS = BRIDGE_CHAINS.map((c) => ({ label: c.label, value: c.value }));
const BALANCE_CACHE_TTL_MS = 8000;
const RPC_TIMEOUT_MS = 2800;

const CHAIN_BALANCE_CONFIG: Record<
  string,
  { rpcUrls: string[]; usdcAddress?: string; decimals: number; nativeUsdc?: boolean }
> = {
  Arc_Testnet: {
    rpcUrls: [
      "https://rpc.testnet.arc.network",
      "https://rpc.drpc.testnet.arc.network",
      "https://rpc.quicknode.testnet.arc.network",
    ],
    decimals: 18,
    nativeUsdc: true,
  },
  Ethereum_Sepolia: {
    rpcUrls: [
      "https://rpc.sepolia.org",
      "https://ethereum-sepolia-rpc.publicnode.com",
      "https://rpc2.sepolia.org",
    ],
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    decimals: 6,
  },
  Base_Sepolia: {
    rpcUrls: ["https://sepolia.base.org", "https://base-sepolia-rpc.publicnode.com"],
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCf7e",
    decimals: 6,
  },
  Arbitrum_Sepolia: {
    rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc", "https://arbitrum-sepolia-rpc.publicnode.com"],
    usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    decimals: 6,
  },
  Optimism_Sepolia: {
    rpcUrls: ["https://sepolia.optimism.io", "https://optimism-sepolia-rpc.publicnode.com"],
    usdcAddress: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
    decimals: 6,
  },
  Avalanche_Fuji: {
    rpcUrls: ["https://api.avax-test.network/ext/bc/C/rpc"],
    usdcAddress: "0x5425890298aed601595a70AB815c96711a31Bc65",
    decimals: 6,
  },
  Polygon_Amoy_Testnet: {
    rpcUrls: ["https://rpc-amoy.polygon.technology", "https://polygon-amoy-bor-rpc.publicnode.com"],
    usdcAddress: "0x41E94Eb019C0762f9Bf8bF9aF6A9f5a4Bf79A46",
    decimals: 6,
  },
};

export default function BridgeTab() {
  const { address, refreshBalances, addTransaction } = useWallet();
  const [sourceChain, setSourceChain] = useState("Arc_Testnet");
  const [destChain, setDestChain] = useState("Ethereum_Sepolia");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [chainBalances, setChainBalances] = useState<Record<string, string>>({});
  const [isBalancesLoading, setIsBalancesLoading] = useState(false);
  const [isSelectedBalanceLoading, setIsSelectedBalanceLoading] = useState(false);
  const [result, setResult] = useState<{ txHash?: string; explorerUrl?: string } | null>(null);
  const [error, setError] = useState("");
  const balanceCacheRef = useRef<Record<string, { balance: string; fetchedAt: number }>>({});

  const isValid = !!address && !!amount && parseFloat(amount) > 0 && sourceChain !== destChain;
  const selectedChainBalance = chainBalances[sourceChain];
  const selectedBalanceDisplay = selectedChainBalance ?? (isBalancesLoading || isSelectedBalanceLoading ? "..." : "0.00");

  function flipChains() {
    setSourceChain(destChain);
    setDestChain(sourceChain);
  }

  function parseUnitsFromHex(hexValue: string, decimals: number) {
    const bigintValue = BigInt(hexValue);
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = bigintValue / divisor;
    const fraction = bigintValue % divisor;
    const fractionStr = fraction.toString().padStart(decimals, "0").slice(0, 4);
    const trimmedFraction = fractionStr.replace(/0+$/, "");
    return trimmedFraction ? `${whole}.${trimmedFraction}` : whole.toString();
  }

  function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = RPC_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...init, signal: controller.signal }).finally(() => window.clearTimeout(timeoutId));
  }

  async function rpcRequest(rpcUrls: string[], method: string, params: unknown[] = []) {
    const payload = JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params });
    const headers = { "Content-Type": "application/json" };
    const attempts = rpcUrls.map(async (rpcUrl) => {
      const response = await fetchWithTimeout(rpcUrl, { method: "POST", headers, body: payload });
      if (!response.ok) throw new Error(`RPC ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || "RPC request failed");
      return data.result as string;
    });

    try {
      return await Promise.any(attempts);
    } catch {
      throw new Error("All RPC endpoints failed");
    }
  }

  async function fetchChainBalance(chainValue: string, walletAddress: string) {
    const cfg = CHAIN_BALANCE_CONFIG[chainValue];
    if (!cfg) return "0.00";
    const cacheKey = `${walletAddress.toLowerCase()}_${chainValue}`;
    const cached = balanceCacheRef.current[cacheKey];
    if (cached && Date.now() - cached.fetchedAt < BALANCE_CACHE_TTL_MS) {
      return cached.balance;
    }
    try {
      let rawBalance = "0x0";
      if (cfg.nativeUsdc) {
        rawBalance = await rpcRequest(cfg.rpcUrls, "eth_getBalance", [walletAddress, "latest"]);
      } else {
        const encodedAddress = walletAddress.toLowerCase().replace("0x", "").padStart(64, "0");
        const callData = `0x70a08231${encodedAddress}`;
        rawBalance = await rpcRequest(cfg.rpcUrls, "eth_call", [{ to: cfg.usdcAddress, data: callData }, "latest"]);
      }
      const parsedBalance = parseUnitsFromHex(rawBalance, cfg.decimals);
      balanceCacheRef.current[cacheKey] = { balance: parsedBalance, fetchedAt: Date.now() };
      return parsedBalance;
    } catch {
      return "0.00";
    }
  }

  const fetchSelectedChainBalance = useCallback(async (chainValue: string, walletAddress: string) => {
    setIsSelectedBalanceLoading(true);
    const balance = await fetchChainBalance(chainValue, walletAddress);
    setChainBalances((prev) => ({ ...prev, [chainValue]: balance }));
    setIsSelectedBalanceLoading(false);
  }, []);

  const fetchAllChainBalances = useCallback(async () => {
    if (!address) {
      setChainBalances({});
      return;
    }
    setIsBalancesLoading(true);
    const entries = await Promise.all(
      CHAIN_OPTIONS.filter((opt) => CHAIN_BALANCE_CONFIG[opt.value]).map(async (opt) => {
        const balance = await fetchChainBalance(opt.value, address);
        return [opt.value, balance] as const;
      })
    );
    setChainBalances(Object.fromEntries(entries));
    setIsBalancesLoading(false);
  }, [address]);

  useEffect(() => {
    fetchAllChainBalances();
  }, [fetchAllChainBalances]);

  useEffect(() => {
    if (!address) {
      setIsSelectedBalanceLoading(false);
      balanceCacheRef.current = {};
      return;
    }
    fetchSelectedChainBalance(sourceChain, address);
  }, [address, sourceChain, fetchSelectedChainBalance]);

  useEffect(() => {
    if (!address) return;
    const intervalId = window.setInterval(() => {
      fetchAllChainBalances();
    }, 12000);
    return () => window.clearInterval(intervalId);
  }, [address, fetchAllChainBalances]);

  async function handleBridge() {
    if (!address || !window.ethereum) return;
    if (!amount) return setError("Enter an amount.");
    if (sourceChain === destChain) return setError("Pick different chains.");

    setLoading(true);
    setError("");
    setResult(null);
    setStatus("Initializing...");

    try {
      const kit = new AppKit();
      const adapter = await createViemAdapterFromProvider({ provider: window.ethereum });
      kit.on("*", (p: { method?: string }) => p.method && setStatus(p.method));
      const res = await kit.bridge({
        from: { adapter, chain: sourceChain as never },
        to: { adapter, chain: destChain as never },
        amount,
        token: "USDC",
      });

      const step = res.steps?.find((s: { txHash?: string }) => s.txHash);
      setResult({ txHash: step?.txHash, explorerUrl: (step as { explorerUrl?: string })?.explorerUrl });
      setStatus("");
      addTransaction({
        type: "bridge",
        txHash: step?.txHash ?? "",
        explorerUrl: (step as { explorerUrl?: string })?.explorerUrl,
        summary: `Bridge ${amount} USDC: ${BRIDGE_CHAINS.find((c) => c.value === sourceChain)?.label} -> ${BRIDGE_CHAINS.find((c) => c.value === destChain)?.label}`,
        timestamp: Date.now(),
      });
      balanceCacheRef.current = {};
      await refreshBalances();
      await fetchAllChainBalances();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-[11px] text-text-2 border border-border bg-surface-2 px-3 py-2">
        This bridge only works for USDC test token.
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-3 mb-2">From</div>
        <div className="field px-4 py-3 space-y-2.5">
          <Dropdown value={sourceChain} options={CHAIN_OPTIONS} onChange={setSourceChain} />
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent text-[24px] font-semibold tracking-tight focus:outline-none placeholder:text-muted min-w-0"
            />
            <div className="token-pill shrink-0">
              <div className="w-[18px] h-[18px] rounded-full token-usdc flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">$</span>
              </div>
              USDC
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-text-3">
            <span>{CHAIN_OPTIONS.find((c) => c.value === sourceChain)?.label}</span>
            <button
              type="button"
              onClick={() => {
                if (selectedChainBalance && selectedChainBalance !== "0.00") {
                  setAmount(selectedChainBalance);
                }
              }}
              className="hover:text-text-2 transition-colors cursor-pointer"
            >
              Bal: {selectedBalanceDisplay} USDC
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-center py-0.5">
        <button
          onClick={flipChains}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:border-border-light transition-colors cursor-pointer"
          style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}
          aria-label="Switch from and to networks"
          type="button"
        >
          <svg className="w-3.5 h-3.5 text-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
          </svg>
        </button>
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-3 mb-2">To</div>
        <div className="field px-4 py-3">
          <Dropdown value={destChain} options={CHAIN_OPTIONS} onChange={setDestChain} />
        </div>
      </div>

      <button onClick={handleBridge} disabled={loading || !address} className={`w-full h-[48px] btn-confirm text-[14px] font-semibold cursor-pointer ${!loading && isValid ? "btn-confirm-active" : ""}`}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {status || "Processing..."}
          </span>
        ) : !address ? (
          "Connect wallet"
        ) : (
          "Confirm bridge"
        )}
      </button>

      {result && <div className="rounded-[10px] p-4 animate-fade-in" style={{ background: "#161616", borderLeft: "3px solid #10b981" }}>Bridge initiated</div>}
      {error && <div className="rounded-[10px] bg-red-dim border border-red/10 p-3.5 animate-fade-in"><p className="text-[11px] text-red">{error}</p></div>}
    </div>
  );
}
