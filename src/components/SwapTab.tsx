import { useState } from "react";
import { AppKit } from "@circle-fin/app-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import { useWallet } from "../context/WalletContext";
import { SWAP_TOKENS } from "../lib/constants";
import Dropdown from "./Dropdown";

const TOKEN_OPTIONS = SWAP_TOKENS.map((t) => ({ label: t, value: t }));

export default function SwapTab() {
  const { address, balances, refreshBalances, addTransaction } = useWallet();
  const [tokenIn, setTokenIn] = useState("USDC");
  const [tokenOut, setTokenOut] = useState("EURC");
  const [amountIn, setAmountIn] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ txHash: string; amountOut?: string; explorerUrl?: string } | null>(null);
  const [error, setError] = useState("");
  const kitKey = (import.meta.env.VITE_CIRCLE_KIT_KEY as string | undefined)?.trim() ?? "";

  const inBal = balances.find((b) => b.symbol === tokenIn);
  const isValid = !!address && !!amountIn && parseFloat(amountIn) > 0 && tokenIn !== tokenOut;

  async function handleSwap() {
    if (!address || !window.ethereum) return;
    if (!amountIn) return setError("Enter an amount.");
    if (tokenIn === tokenOut) return setError("Pick different tokens.");
    if (!kitKey) {
      return setError(
        "Swap is not configured yet. Add VITE_CIRCLE_KIT_KEY to your .env (format: KIT_KEY:<keyId>:<keySecret>)."
      );
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const kit = new AppKit();
      const adapter = await createViemAdapterFromProvider({ provider: window.ethereum });
      const res = await kit.swap({
        from: { adapter, chain: "Arc_Testnet" as never },
        tokenIn: tokenIn as never,
        tokenOut: tokenOut as never,
        amountIn,
        config: { kitKey },
      });

      setResult({ txHash: res.txHash, amountOut: res.amountOut, explorerUrl: res.explorerUrl });
      addTransaction({
        type: "swap",
        txHash: res.txHash,
        explorerUrl: res.explorerUrl,
        summary: `Swapped ${amountIn} ${tokenIn} for ${res.amountOut ?? "?"} ${tokenOut}`,
        timestamp: Date.now(),
      });
      await refreshBalances();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="field flex items-center gap-3 px-4 py-3">
        <input
          type="text"
          value={amountIn}
          onChange={(e) => setAmountIn(e.target.value)}
          placeholder="0.00"
          className="flex-1 bg-transparent text-[24px] font-semibold tracking-tight focus:outline-none placeholder:text-muted min-w-0"
        />
        <div className="w-[100px]">
          <Dropdown value={tokenIn} options={TOKEN_OPTIONS} onChange={setTokenIn} />
        </div>
      </div>

      <div className="field flex items-center gap-3 px-4 py-3">
        <div
          className={`flex-1 text-[24px] font-semibold tracking-tight min-w-0 ${
            result?.amountOut || (amountIn && parseFloat(amountIn) > 0) ? "text-text" : "text-muted"
          }`}
        >
          {result?.amountOut ?? (amountIn && parseFloat(amountIn) > 0 ? `~${parseFloat(amountIn).toFixed(2)}` : "0.00")}
        </div>
        <div className="w-[100px]">
          <Dropdown value={tokenOut} options={TOKEN_OPTIONS} onChange={setTokenOut} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-text-3">
        <span>Arc Testnet</span>
        <button onClick={() => inBal && setAmountIn(inBal.balance)} className="hover:text-text-2 transition-colors cursor-pointer">
          Bal: {inBal ? parseFloat(inBal.balance).toFixed(2) : "0.00"} {tokenIn}
        </button>
      </div>

      <button
        onClick={handleSwap}
        disabled={loading || !address}
        className={`w-full h-[48px] btn-confirm text-[14px] font-semibold cursor-pointer ${isValid ? "btn-confirm-active" : ""}`}
      >
        {loading ? "Swapping..." : !address ? "Connect wallet" : "Confirm swap"}
      </button>

      {result && (
        <div className="rounded-[10px] p-4 animate-fade-in" style={{ background: "#161616", borderLeft: "3px solid #10b981" }}>
          Swap confirmed
        </div>
      )}
      {error && (
        <div className="rounded-[10px] bg-red-dim border border-red/10 p-3.5 animate-fade-in">
          <p className="text-[11px] text-red">{error}</p>
        </div>
      )}
    </div>
  );
}
