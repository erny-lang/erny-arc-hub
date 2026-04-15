import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { createPublicClient, http, formatUnits } from "viem";
import { ARC_TESTNET_CHAIN, ARC_TESTNET_CHAIN_ID, USDC_ADDRESS, EURC_ADDRESS, ERC20_ABI } from "../lib/constants";

export interface TokenBalance {
  symbol: string;
  address: string;
  balance: string;
  raw: bigint;
}

export interface TxRecord {
  type: "send" | "bridge" | "swap";
  txHash: string;
  explorerUrl?: string;
  summary: string;
  timestamp: number;
}

interface WalletState {
  address: string | null;
  isConnecting: boolean;
  balances: TokenBalance[];
  isLoadingBalances: boolean;
  transactions: TxRecord[];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  changeWallet: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  addTransaction: (tx: TxRecord) => void;
}

const WalletContext = createContext<WalletState | null>(null);

const publicClient = createPublicClient({
  chain: ARC_TESTNET_CHAIN,
  transport: http(),
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [transactions, setTransactions] = useState<TxRecord[]>([]);

  const TX_LIMIT = 20;

  function storageKey(addr: string) {
    return `arc_hub_transactions_${addr.toLowerCase()}`;
  }

  function loadTxs(addr: string): TxRecord[] {
    try {
      const raw = localStorage.getItem(storageKey(addr));
      return raw ? (JSON.parse(raw) as TxRecord[]).slice(0, TX_LIMIT) : [];
    } catch {
      return [];
    }
  }

  function saveTxs(addr: string, txs: TxRecord[]) {
    try {
      localStorage.setItem(storageKey(addr), JSON.stringify(txs.slice(0, TX_LIMIT)));
    } catch {
      // ignore storage write failures
    }
  }

  const addTransaction = useCallback(
    (tx: TxRecord) => {
      setTransactions((prev) => {
        const next = [tx, ...prev].slice(0, TX_LIMIT);
        if (address) saveTxs(address, next);
        return next;
      });
    },
    [address]
  );

  const fetchBalances = useCallback(async (addr: string) => {
    setIsLoadingBalances(true);
    try {
      const tokens = [
        { symbol: "USDC", address: USDC_ADDRESS },
        { symbol: "EURC", address: EURC_ADDRESS },
      ];

      const results = await Promise.all(
        tokens.map(async (token) => {
          try {
            const raw = (await publicClient.readContract({
              address: token.address as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [addr as `0x${string}`],
            })) as bigint;

            return { symbol: token.symbol, address: token.address, balance: formatUnits(raw, 6), raw };
          } catch {
            return { symbol: token.symbol, address: token.address, balance: "0", raw: 0n };
          }
        })
      );

      setBalances(results);
    } finally {
      setIsLoadingBalances(false);
    }
  }, []);

  const requestSessionSignature = useCallback(async (addr: string) => {
    const message = [
      "Arc Wallet Hub verification",
      `Address: ${addr}`,
      `Time: ${new Date().toISOString()}`,
      "Sign to verify wallet ownership for this session.",
    ].join("\n");

    await window.ethereum?.request({
      method: "personal_sign",
      params: [message, addr],
    });
  }, []);

  const connect = useCallback(async () => {
    if (typeof window.ethereum === "undefined") {
      alert("Please install MetaMask");
      return;
    }

    setIsConnecting(true);
    try {
      await window.ethereum.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts[0]) throw new Error("No account returned");

      const addr = accounts[0];

      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${ARC_TESTNET_CHAIN_ID.toString(16)}` }],
        });
      } catch (switchError: unknown) {
        const err = switchError as { code?: number };
        if (err.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${ARC_TESTNET_CHAIN_ID.toString(16)}`,
                chainName: "Arc Testnet",
                nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
                rpcUrls: ["https://rpc.testnet.arc.network"],
                blockExplorerUrls: ["https://testnet.arcscan.app"],
              },
            ],
          });
        }
      }

      await requestSessionSignature(addr);
      setAddress(addr);
      await fetchBalances(addr);
    } catch (err) {
      console.error("Failed to connect:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [fetchBalances, requestSessionSignature]);

  const disconnect = useCallback(async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch {
        // Some wallets do not support revoke.
      }
    }

    setAddress(null);
    setBalances([]);
    setTransactions([]);
  }, []);

  const changeWallet = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      if (accounts[0]) {
        await requestSessionSignature(accounts[0]);
        setAddress(accounts[0]);
        await fetchBalances(accounts[0]);
      }
    } catch (err) {
      console.error("Failed to change wallet:", err);
    }
  }, [fetchBalances, requestSessionSignature]);

  const refreshBalances = useCallback(async () => {
    if (address) await fetchBalances(address);
  }, [address, fetchBalances]);

  useEffect(() => {
    if (address) setTransactions(loadTxs(address));
  }, [address]);

  useEffect(() => {
    if (!window.ethereum || !address) return;
    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAddress(accounts[0]);
        fetchBalances(accounts[0]);
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
  }, [address, disconnect, fetchBalances]);

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnecting,
        balances,
        isLoadingBalances,
        transactions,
        connect,
        disconnect,
        changeWallet,
        refreshBalances,
        addTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
