# Arc Settlement — NanoProof Protocol

> How NanoProof settles USDC nano-payments on Arc testnet, produces immutable
> settlement proofs, and verifies them on ArcScan.

## Arc testnet at a glance

| Property | Value |
|---|---|
| Network name | Arc Testnet |
| Chain ID | 5042002 |
| RPC URL | https://rpc.testnet.arc.network |
| WebSocket | wss://rpc.testnet.arc.network |
| Block explorer | https://testnet.arcscan.app |
| ArcScan API | https://testnet.arcscan.app/api/v2 (Blockscout v2) |
| Native gas token | **USDC** (Circle's stablecoin-native L1) |
| USDC ERC-20 interface | `0x3600000000000000000000000000000000000000` |
| USDC decimals (ERC-20) | 6 |
| CCTP domain | 26 |
| Finality | Deterministic BFT — 1 confirmation is final |
| Block time | Sub-second (~500ms) |

## Settlement architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     NanoProof Facilitator                        │
│                                                                  │
│  ┌─────────────────┐      ┌────────────────────┐                │
│  │  X402 Service   │─────▶│  Payment + Proof   │                │
│  │  (NestJS)       │      │  (Prisma + Postgres)│               │
│  └────────┬────────┘      └────────────────────┘                │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐      ┌────────────────────┐                │
│  │  Arc Tx Submit  │─────▶│ Arc RPC + ArcScan  │                │
│  │  (viem/ethers)  │      │ (Blockscout v2)    │                │
│  └─────────────────┘      └────────────────────┘                │
└──────────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   Arc Testnet L1        │
              │   (Circle's BFT chain)  │
              └─────────────────────────┘
```

## Settlement proof schema

Every settled Payment gets a `SettlementProof` row:

```typescript
{
  id: "sprf_abc123",
  paymentId: "pay_def456",
  paymentHash: "0xa1b2...",          // sha256(canonical body)
  txHash: "0xdeadbeef...",            // from Arc receipt
  blockNumber: 9500123n,
  blockTimestamp: "2026-07-03T11:30:48Z",
  blockHash: "0x...",
  arcScanUrl: "https://testnet.arcscan.app/tx/0xdeadbeef...",
  facilitator: "0x0000...0000",
  network: "ARC_TESTNET",
  chainId: 5042002,

  // Settlement terms (denormalized for immutable record)
  amountUsdc: "1000",
  assetAddress: "0x3600000000000000000000000000000000000000",
  payerAddress: "0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc",
  payeeAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  nonce: "0xa1b2c3d4...",

  // Verification state
  verificationStatus: "VERIFIED",      // PENDING | VERIFIED | FAILED | INCONCLUSIVE
  confirmedAt: "2026-07-03T11:30:48Z",
  verificationAttempts: 1,
  lastCheckedAt: "2026-07-03T11:30:48Z",

  // Hash chain (tamper-evident link to previous proof for this creator)
  prevHash: "0x...",                    // previous SettlementProof.hash
  hash: "0x...",                        // sha256(prevHash + canonical body)
}
```

### Canonical settlement body

```typescript
const canonicalBody = {
  paymentRequestId: req.id,
  creatorId: req.creatorId,
  resource: req.resource,
  amountUsdc: req.amountUsdc,
  currency: req.currency,
  network: req.network,
  chainId: req.chainId,
  assetAddress: req.assetAddress,
  payer: payerAddress,
  payee: req.payTo,
  nonce: req.nonce,
  validAfter: req.validAfter.toString(),
  validBefore: req.validBefore.toString(),
  txHash,
  blockNumber: blockNumber.toString(),
  settledAt: settledAt.toISOString(),
};
const paymentHash = sha256Hex(canonicalize(canonicalBody));
```

### Hash chain

```
Proof 1: hash₀ = "0x" + "0"*64    (genesis)
Proof 2: hash₁ = sha256(hash₀ || canonical₁)
Proof 3: hash₂ = sha256(hash₁ || canonical₂)
Proof N: hash_{N-1} = sha256(hash_{N-2} || canonical_{N-1})
```

Modifying any historical settlement breaks the chain. Anyone can verify by:
1. Reading all SettlementProofs for a creator (ordered by createdAt)
2. Recomputing each `hash` and comparing to `prevHash`

Combined with onchain ArcScan verification, the proof is **cryptographically
grounded** — you can prove a settlement both in the database AND onchain.

## ArcScan verification

### Blockscout v2 API

ArcScan is a Blockscout v2 deployment. Endpoint shape:

```
GET https://testnet.arcscan.app/api/v2/transactions/{txHash}
```

Response (200):
```json
{
  "hash": "0x...",
  "block_number": 9500123,
  "timestamp": "2026-07-03T11:30:48Z",
  "from": { "hash": "0x..." },
  "to":   { "hash": "0x..." },
  "status": "ok",          // "ok" | "error"
  "method": "transfer",    // ERC-20 method called
  "confirmations": 1
}
```

Response (404) — tx not yet indexed:
```json
{ "message": "Not found" }
```

### Verification logic

```typescript
async verify(txHash: string) {
  const resp = await fetch(`${arcscanApi}/transactions/${txHash}`);
  
  if (resp.status === 404) {
    return { found: false, status: "PENDING", error: "tx not yet indexed" };
  }
  
  if (!resp.ok) {
    return { found: false, status: "PENDING", error: `ArcScan HTTP ${resp.status}` };
  }
  
  const body = await resp.json();
  
  return {
    found: true,
    success: body.status === "ok",
    confirmations: body.confirmations ?? 1,
    blockNumber: body.block_number,
    // ...
  };
}
```

Arc's deterministic BFT finality means **1 confirmation = final**. We treat any
mined tx with `status === "ok"` as VERIFIED.

### VerificationEvent timeline

Every verification attempt (initial + on-demand re-check) appends an event:

```typescript
{
  id: "vev_abc123",
  proofId: "sprf_def456",
  txHash: "0x...",
  status: "VERIFIED",
  confirmations: 1,
  source: "ARCSCAN",       // or "SYNTHETIC" in demo mode
  payload: { /* full verifier response */ },
  blockNumber: "9500123",
  errorMessage: null,
  checkedAt: "2026-07-03T11:30:48Z"
}
```

This is the audit trail. The UI shows the timeline:

```
#3  ✓ VERIFIED   via ARCSCAN  · 1 confirmation
     2026-07-03 11:30:48 · block 9500123
#2  ⏳ PENDING   via ARCSCAN  · 0 confirmations  
     2026-07-03 11:30:47 · block null
#1  ✓ VERIFIED   via ARCSCAN  · 1 confirmation
     2026-07-03 11:30:45 · block 9500120
```

## Determinism + cache

`ArcScanVerifierService` caches txHash → status for 30 seconds to avoid hammering
ArcScan. The cache is in-memory and per-instance — in a multi-instance deployment
each pod has its own cache.

## Demo mode

When `NANOPROOF_DEMO_MODE=true`:

```typescript
if (demoMode && demoExpected) {
  const status: ArcScanTxStatus = {
    found: true,
    success: true,
    confirmations: 1,
    blockNumber: demoExpected.blockNumber.toString(),
    blockTimestamp: demoExpected.settledAt.toISOString(),
    from: demoExpected.from,
    to: demoExpected.to,
    method: "transfer",
    explorerUrl: arcScanTxUrl(txHash),
    checkedAt: new Date().toISOString(),
    source: "SYNTHETIC",    // <-- clear marker that this isn't live
  };
  return status;
}
```

`source: "SYNTHETIC"` makes it obvious in the UI / logs that the verification
isn't a live ArcScan call.

## Live deployment

For a production deployment, set `NANOPROOF_DEMO_MODE=false` and:

1. **Configure the facilitator wallet** — needs USDC for gas
2. **Implement EIP-712 signature verification** — recover signer from `(v, r, s)`
   and check it matches `payload.from`
3. **Submit transferWithAuthorization** — via viem or ethers:

```typescript
import { createWalletClient, http } from 'viem';
import { arcTestnet } from 'viem/chains';
import { usdcAbi } from './abis';

const client = createWalletClient({
  chain: arcTestnet,
  transport: http(process.env.ARC_RPC_URL),
  account: facilitatorAccount,
});

const txHash = await client.writeContract({
  address: USDC_ADDRESS,
  abi: usdcAbi,
  functionName: 'transferWithAuthorization',
  args: [from, to, value, validAfter, validBefore, nonce, v, r, s],
});
```

4. **Pass real txHash to ArcScan verification** — already wired
5. **Back the demo banner** with a clear note that "live" verification requires
   `NANOPROOF_DEMO_MODE=false`

## Why Arc?

We chose Arc over other L2s for Phase 8 because:

| Property | Arc | Other L2s |
|---|---|---|
| Native gas = USDC | ✅ | ❌ (volatile ETH/MATIC/etc.) |
| Sub-second finality | ✅ | varies (12s-2min) |
| Sub-cent fees | ✅ | varies (often $0.01+) |
| CCTP canonical USDC | ✅ domain 26 | ✅ (different domains) |
| Hackathon partner | ✅ | varies |
| Open agent stack | ✅ | varies |

Combined with `NANOPROOF_DEMO_MODE=true` for the judges, Arc gives us a
production-realistic settlement layer without requiring the demo participants
to bridge funds.

## Where to read more

- Phase 8 overview: `docs/PHASE8.md`
- x402 implementation: `docs/X402_IMPLEMENTATION.md`
- Payment flow: `docs/PAYMENT_FLOW.md`
- API reference: `docs/API_REFERENCE.md`