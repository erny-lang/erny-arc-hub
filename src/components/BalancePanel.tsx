import { useWallet } from "../context/WalletContext";

function fmt(value: string, digits = 2): string {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default function BalancePanel() {
  const { address, balances, isLoadingBalances, refreshBalances } = useWallet();
  const usdc = balances.find((b) => b.symbol === "USDC");
  const eurc = balances.find((b) => b.symbol === "EURC");
  const total = balances.reduce((sum, b) => sum + (b.symbol === "USDC" ? parseFloat(b.balance) : 0), 0);

  if (!address) return <div className="card p-6 text-center"><p className="text-[11px] text-text-3">Connect wallet to view balances</p></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-3 mb-1.5">Balance</div>
          {isLoadingBalances ? <div className="h-7 w-20 rounded bg-surface-2 shimmer" /> : <div className="text-[24px] font-bold tracking-[-0.02em] leading-none">${fmt(total.toString())}</div>}
        </div>
        <div className="card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-3 mb-1.5">USDC</div>
          {isLoadingBalances ? <div className="h-7 w-16 rounded bg-surface-2 shimmer" /> : <div className="text-[24px] font-bold tracking-[-0.02em] leading-none">{fmt(usdc?.balance ?? "0")}</div>}
        </div>
      </div>

      <div className="space-y-2">
        <div className="row-card flex items-center justify-between">
          <span className="text-[12px] font-semibold">USDC</span>
          <span className="text-[12px]">{fmt(usdc?.balance ?? "0")} USDC</span>
        </div>
        <div className="row-card flex items-center justify-between">
          <span className="text-[12px] font-semibold">EURC</span>
          <span className="text-[12px]">{fmt(eurc?.balance ?? "0")} EURC</span>
        </div>
      </div>

      <button onClick={refreshBalances} disabled={isLoadingBalances} className="text-[10px] text-text-3 hover:text-text-2 transition-colors cursor-pointer disabled:opacity-40">
        Refresh balances
      </button>
    </div>
  );
}
