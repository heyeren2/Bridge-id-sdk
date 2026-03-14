# bridge-id-sdk

Attribution and analytics SDK for Circle CCTP bridge integrators.

Gives every bridge a unique ID, tracks the burn→mint lifecycle, and exposes
transaction history and analytics — without wrapping or modifying CCTP contracts.

---

## How It Works

```
Your Bridge Frontend
        │
        ├─ calls sdk.bridge() — executes approve + BridgeRouter.bridge() on-chain
        │     └─ Router emits BridgeInitiated(bridgeId, wallet, amount, nonce)
        │
        └─ SDK automatically calls trackBurn() after the tx confirms
              └─ Sends burn metadata to your analytics backend
```

Your analytics backend listens for mint events on the destination chain
via Goldsky webhooks and automatically updates transaction status.

---

## Installation

```bash
npm install bridge-id-sdk
```

---

## Step 1: Generate Your Bridge ID

Run this once when setting up. This gives you a unique ID that links
all your bridge transactions together in the analytics backend.

```bash
npx bridgeidsdk --name "MyBridge" --address "0xYOUR_ROUTER_ADDRESS"
```

Output:
```
✅ Your Bridge ID:

   mybridge_a3f9c2

Add this to your .env:

   NEXT_PUBLIC_BRIDGE_ID=mybridge_a3f9c2
```

Store this in your `.env` file. Never change it, all your historical
transactions are permanently linked to this ID.

---

## Step 2: Initialize the SDK

```typescript
import { BridgeAnalytics } from "bridge-id-sdk"

const sdk = new BridgeAnalytics({
  bridgeId: process.env.NEXT_PUBLIC_BRIDGE_ID,
  apiUrl: "https://your-analytics-backend.xyz",

  // Optional — pass your own RPC URLs for better reliability
  // If not provided, the SDK falls back to free public RPCs
  rpcUrls: {
    sepolia: process.env.NEXT_PUBLIC_SEPOLIA_RPC,
    base:    process.env.NEXT_PUBLIC_BASE_RPC,
    arc:     process.env.NEXT_PUBLIC_ARC_RPC,
  }
})
```

---

## Supported Routes

The SDK only tracks transactions where **both** the source and destination
chain have a BridgeRouter deployed. If either chain is not supported,
call CCTP contracts directly in your frontend, and do not call `sdk.bridge()`.

| Route                  | Status   |
|------------------------|----------|
| Sepolia → Base         | ✓ Live   |
| Sepolia → Arc          | ✓ Live   |
| Base → Sepolia         | ✓ Live   |
| Base → Arc             | ✓ Live   |
| Arc → Sepolia          | ✓ Live   |
| Arc → Base             | ✓ Live   |

For unsupported routes (e.g. Optimism → Sei), call CCTP contracts
directly in your frontend. The SDK will throw `CHAIN_NOT_FOUND` if you
try to call `sdk.bridge()` with an unsupported chain — use that as your
signal to fall back to direct CCTP.

```typescript
import { BridgeError } from "bridge-id-sdk"

const ROUTER_CHAINS = ["sepolia", "base", "arc"]

const bothSupported =
  ROUTER_CHAINS.includes(sourceChain) &&
  ROUTER_CHAINS.includes(destinationChain)

if (bothSupported) {
  // Use SDK — router + full tracking
  await sdk.bridge({ amount, sourceChain, destinationChain, recipientAddress, walletClient })
} else {
  // Use CCTP directly — no tracking
  await callCCTPDirectly({ ... })
}
```

---

## Step 3: Execute a Bridge

Call this to bridge USDC between two supported chains. The SDK handles
the USDC approval, the router call, and tracking the burn automatically.

```typescript
const txHash = await sdk.bridge({
  amount: "100.00",              // USDC amount as string
  sourceChain: "sepolia",
  destinationChain: "base",
  recipientAddress: "0x...",     // user's wallet on destination chain
  walletClient,                  // from wagmi or viem
})
```

---

## Step 4: Check Transaction Status

Use this to show real-time bridge progress to your users.

```typescript
const status = await sdk.getStatus("0xBURN_TX_HASH")

// status.status is one of:
//   "burned"    — burn confirmed, waiting for Circle attestation (~2 min)
//   "attested"  — Circle signed it, ready to mint on destination
//   "minted"    — bridge complete
//   "not_found" — tx not found or not tracked

if (status.status === "attested") {
  // Attestation is ready — show Remint button in your frontend
  // Pass status.messageBytes + status.attestation to CCTP receiveMessage()
  console.log("Ready to mint:", status.attestation)
}
```

**Remint flow**: if status is `attested` and the mint hasn't executed,
show a Remint button in your frontend. Your frontend calls
`receiveMessage(messageBytes, attestation)` on the destination chain's
MessageTransmitter directly. The SDK provides `messageBytes` and
`attestation` in the status result.

---

## Step 5: Fetch User Activity

Use this to populate your activity tab.

```typescript
const activity = await sdk.getUserActivity(walletAddress)

// activity.transactions[n]:
// {
//   burnTxHash:       "0x...",
//   mintTxHash:       "0x..." | null,
//   amount:           "100.00",
//   sourceChain:      "sepolia",
//   destinationChain: "base",
//   status:           "burned" | "attested" | "minted" | "failed",
//   timestamp:        1234567890
// }
```

---

## Step 6: Fetch Transaction List

```typescript
const txs = await sdk.getTransactions({
  wallet: userAddress,
  limit: 20,
  offset: 0,
})
```

---

## Error Handling

All SDK methods throw a `BridgeError` on failure. Catch it to show
the right message to your users.

```typescript
import { BridgeError } from "bridge-id-sdk"

try {
  await sdk.bridge({ ... })
} catch (err) {
  if (err instanceof BridgeError) {
    switch (err.code) {
      case "INVALID_INPUT":
        // Bad address, amount, or missing field
        showToast(err.message)
        break
      case "CHAIN_NOT_FOUND":
        // Chain not supported — fall back to CCTP direct
        await callCCTPDirectly({ ... })
        break
      case "NETWORK_ERROR":
        // RPC or backend unreachable — show retry
        showToast("Connection failed. Please try again.")
        break
      case "NOT_FOUND":
        // Transaction not found
        showToast("Transaction not found.")
        break
      case "CONFIG_ERROR":
        // Missing bridgeId or apiUrl on init
        console.error("SDK misconfigured:", err.message)
        break
    }
  }
}
```

### Error codes

| Code            | When it happens                                      |
|-----------------|------------------------------------------------------|
| `INVALID_INPUT` | Bad tx hash, wallet address, amount, or missing field |
| `CHAIN_NOT_FOUND` | Chain not in supported routes                      |
| `NETWORK_ERROR` | RPC call or backend request failed                   |
| `NOT_FOUND`     | Transaction not found in backend                     |
| `CONFIG_ERROR`  | Missing `bridgeId` or `apiUrl` on SDK init           |

---

## Full Integration Example

```typescript
import { BridgeAnalytics, BridgeError } from "bridge-id-sdk"

const sdk = new BridgeAnalytics({
  bridgeId: process.env.NEXT_PUBLIC_BRIDGE_ID,
  apiUrl:   process.env.NEXT_PUBLIC_ANALYTICS_URL,
  rpcUrls: {
    sepolia: process.env.NEXT_PUBLIC_SEPOLIA_RPC,
    base:    process.env.NEXT_PUBLIC_BASE_RPC,
    arc:     process.env.NEXT_PUBLIC_ARC_RPC,
  }
})

const ROUTER_CHAINS = ["sepolia", "base", "arc"]

async function handleBridge({ amount, sourceChain, destinationChain, recipient, walletClient }) {
  const bothSupported =
    ROUTER_CHAINS.includes(sourceChain) &&
    ROUTER_CHAINS.includes(destinationChain)

  if (bothSupported) {
    try {
      const txHash = await sdk.bridge({
        amount,
        sourceChain,
        destinationChain,
        recipientAddress: recipient,
        walletClient,
      })
      console.log("Bridge tx:", txHash)
    } catch (err) {
      if (err instanceof BridgeError) {
        console.error(err.code, err.message, err.details)
      }
    }
  } else {
    // Call CCTP contracts directly for unsupported routes
    await callCCTPDirectly({ amount, sourceChain, destinationChain, recipient, walletClient })
  }
}

// Render activity tab
const activity = await sdk.getUserActivity(userAddress)

// Poll status every 30 seconds until minted
const status = await sdk.getStatus(burnTxHash)
```

---

## What the SDK Does NOT Do

- Does not execute transactions for unsupported chains
- Does not touch or custody user funds
- Does not handle the remint flow (your frontend does this)
- Does not wrap or modify CCTP contracts
- Does not store or expose RPC API keys

The SDK is a routing, recording, and querying layer.

---

## Backend

This SDK requires a running analytics backend to function.
The backend handles burn tracking, Goldsky webhook ingestion,
mint confirmation, and analytics aggregation.

Backend setup guide and source code:
👉 https://github.com/heyeren2/bridge-id-backend-template

---

## License

MIT