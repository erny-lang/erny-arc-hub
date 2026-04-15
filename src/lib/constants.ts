export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_TESTNET_RPC = "https://rpc.testnet.arc.network";

export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;
export const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as const;

export const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const ARC_TESTNET_CHAIN = {
  id: ARC_TESTNET_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [ARC_TESTNET_RPC] } },
  blockExplorers: { default: { name: "ArcScan", url: "https://testnet.arcscan.app" } },
} as const;

export const BRIDGE_CHAINS = [
  { label: "Arc Testnet", value: "Arc_Testnet" },
  { label: "Ethereum Sepolia", value: "Ethereum_Sepolia" },
  { label: "Base Sepolia", value: "Base_Sepolia" },
  { label: "Arbitrum Sepolia", value: "Arbitrum_Sepolia" },
  { label: "Optimism Sepolia", value: "Optimism_Sepolia" },
  { label: "Avalanche Fuji", value: "Avalanche_Fuji" },
  { label: "Polygon Amoy", value: "Polygon_Amoy_Testnet" },
] as const;

export const SWAP_TOKENS = ["USDC", "EURC", "USDT", "WETH", "WBTC", "NATIVE"] as const;
