## Arc Sepolia -> Arc Testnet Bridge App

Simple frontend app that bridges **USDC from Ethereum Sepolia to Arc Testnet** directly from the connected wallet (no backend private key).

This uses:
- `@circle-fin/bridge-kit`
- `@circle-fin/adapter-viem-v2`

References:
- [Connect to Arc](https://docs.arc.network/arc/references/connect-to-arc)
- [Bridge USDC to Arc](https://docs.arc.network/arc/tutorials/bridge-usdc-to-arc)

## Arc Testnet network details used
- RPC: `https://rpc.testnet.arc.network`
- Chain ID: `5042002` (`0x4cef52`)
- Explorer: `https://testnet.arcscan.app`
- Faucet: `https://faucet.circle.com`

Source: [Connect to Arc](https://docs.arc.network/arc/references/connect-to-arc)

## Prerequisites
- Node.js v22+
- Browser wallet (MetaMask)
- Wallet funded with:
  - Sepolia ETH for gas
  - Sepolia USDC to bridge

Install and run:

```bash
npm install
npm run dev
```

App URL: `http://localhost:5173`

## How to bridge
1. Open the app.
2. Click **Connect Wallet**.
3. Set amount (e.g. `1.00`).
4. Click **Bridge Now**.
5. Approve wallet popups for bridge transactions.
6. Track txs via returned result and Arc explorer.

## Notes
- No private key is stored in app code or server.
- Each user signs from their own wallet popup.

