import { useState } from "react";
import { AppKit } from "@circle-fin/app-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import { useWallet } from "../context/WalletContext";

export default function SendTab() {
  const { address, balances, refreshBalances, addTransaction } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ txHash: string; explorerUrl?: string } | null>(null);
  const [error, setError] = useState("");

  const usdcBal = balances.find((b) => b.symbol === "USDC");
  const isValid = !!address && !!recipient && !!amount && parseFloat(amount) > 0;

  async function handleSend() {
    if (!address || !window.ethereum) return;
    if (!recipient || !amount) {
      setError("Fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const kit = new AppKit();
      const adapter = await createViemAdapterFromProvider({ provider: window.ethereum });
      const res = await kit.send({
        from: { adapter, chain: "Arc_Testnet" as never },
        to: recipient,
        amount,
        token: "USDC",
      });

      setResult({ txHash: res.txHash ?? "", explorerUrl: res.explorerUrl });
      addTransaction({
        type: "send",
        txHash: res.txHash ?? "",
        explorerUrl: res.explorerUrl,
        summary: `Sent ${amount} USDC to ${recipient.slice(0, 6)}...${recipient.slice(-4)}`,
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
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-3 mb-2">You Pay</div>
        <div className="flex items-center gap-3 px-1">
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-transparent text-[38px] font-bold tracking-[-0.02em] focus:outline-none placeholder:text-muted/40 min-w-0"
          />
          <div className="token-pill shrink-0">
            <div className="w-[18px] h-[18px] rounded-full token-usdc flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">$</span>
            </div>
            USDC
          </div>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-text-3">
          <span>Arc Testnet</span>
          <button onClick={() => usdcBal && setAmount(usdcBal.balance)} className="hover:text-text-2 transition-colors cursor-pointer">
            Bal: {usdcBal ? parseFloat(usdcBal.balance).toFixed(2) : "0.00"} USDC
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
          <svg className="w-3.5 h-3.5 text-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-3 mb-2">To</div>
        <div className="field px-4 py-3">
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Recipient address (0x...)"
            className="w-full bg-transparent text-[13px] font-mono focus:outline-none placeholder:text-muted/40"
          />
        </div>
      </div>

      <button
        onClick={handleSend}
        disabled={loading || !address}
        className={`w-full h-[48px] btn-confirm text-[14px] font-semibold cursor-pointer ${isValid ? "btn-confirm-active" : ""}`}
      >
        {loading ? "Sending..." : !address ? "Connect wallet" : "Confirm transfer"}
      </button>

      {result && (
        <div className="rounded-[10px] p-3.5 animate-fade-in" style={{ background: "#161616", borderLeft: "3px solid #10b981" }}>
          <p className="text-[10px] text-text-3 font-mono truncate">{result.txHash}</p>
          {result.explorerUrl && (
            <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-[10px] text-green underline underline-offset-2 hover:text-emerald-400 transition-colors">
              View on ArcScan &rarr;
            </a>
          )}
        </div>
      )}
      {error && (
        <div className="rounded-[10px] bg-red-dim border border-red/10 p-3 animate-fade-in">
          <p className="text-[10px] text-red">{error}</p>
        </div>
      )}
    </div>
  );
}
