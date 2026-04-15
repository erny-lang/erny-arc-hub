import { useWallet, type TxRecord } from "../context/WalletContext";

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function TxRow({ tx }: { tx: TxRecord }) {
  const url = tx.explorerUrl || (tx.txHash ? `https://testnet.arcscan.app/tx/${tx.txHash}` : "");
  return (
    <a href={url || "#"} target={url ? "_blank" : undefined} rel="noopener noreferrer" className="block row-card cursor-pointer">
      <div className="text-[12px] font-semibold">{tx.summary}</div>
      <div className="text-[10px] text-text-3 mt-0.5">{timeAgo(tx.timestamp)}</div>
    </a>
  );
}

export default function ActivityPanel() {
  const { transactions, address } = useWallet();
  const visibleTransactions = transactions.slice(0, 3);

  if (!address) return <div className="card p-6 text-center"><p className="text-[11px] text-text-3">Connect wallet to see activity</p></div>;
  if (!visibleTransactions.length) return <div className="card p-6 text-center"><p className="text-[11px] text-text-3">No transactions yet</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-0.5">
        <span className="text-[12px] font-semibold">Activity</span>
      </div>
      <div className="space-y-2 max-h-[340px] overflow-y-auto">
        {visibleTransactions.map((tx, i) => (
          <TxRow key={`${tx.txHash}-${i}`} tx={tx} />
        ))}
      </div>
    </div>
  );
}
