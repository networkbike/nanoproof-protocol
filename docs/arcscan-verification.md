# ArcScan Verification

> Every settled PaymentIntent has a public, cryptographically verifiable receipt on ArcScan. This document is the protocol's promise to creators, agents, and auditors that no payment can be silently altered or hidden.

---

## Table of contents

- [Purpose](#purpose)
- [What "verified" means](#what-verified-means)
- [Receipt lifecycle](#receipt-lifecycle)
- [ArcScan integration](#arcscan-integration)
- [Hash chain](#hash-chain)
- [Public verification API](#public-verification-api)
- [Indexing + mirroring](#indexing--mirroring)
- [Auditor replay](#auditor-replay)
- [Receipt schema](#receipt-schema)
- [UI integration](#ui-integration)
- [See also](#see-also)

---

## Purpose

When a Creator asks "did I get paid for that citation?", the answer must be:

1. **Public** — anyone with the citation ID can verify.
2. **Tamper-evident** — modifying the historical record breaks a hash chain.
3. **Verifiable onchain** — the canonical source of truth is Arc L1.
4. **Reconstructable** — given the citation's evidence, anyone can replay the allocation.

ArcScan + the NanoProof Receipt hash chain provide all four.

---

## What "verified" means

A Receipt is **verified** when:

1. **It exists in our local DB.** (Operator can verify.)
2. **It exists on Arc L1.** (Anyone can verify via ArcScan.)
3. **The onchain txHash matches our local `txHash`.** (Anyone can verify.)
4. **The onchain block timestamp is within ±10 s of our `blockTimestamp`.** (Sanity.)
5. **The USDC `Transfer` events onchain sum to `totalAtomic`.** (Sum check.)
6. **The next Receipt's `prevHash` equals this Receipt's `hash`.** (Chain check.)

A Receipt that fails any of these is flagged for reconciliation.

---

## Receipt lifecycle

```
1. PaymentIntent created         (status: PENDING)
2. Payouts allocated             (status: SIGNED)
3. x402 envelope signed          (status: SIGNED)
4. Batch submitted to Gateway    (status: SIGNED)
5. Arc tx submitted              (status: BROADCAST)
6. Arc finality                  (status: SETTLED, onchain confirmed)
7. Receipt persisted             (status: SETTLED, hash chained)
8. Indexer mirrors to public     (status: INDEXED)
9. Public dashboard renders      (visible everywhere)
```

States:
- `PENDING` — PaymentIntent queued for next batching window.
- `SIGNED` — x402 envelope signed offchain; awaiting batch submission.
- `BROADCAST` — submitted to Arc; awaiting finality.
- `SETTLED` — onchain finality confirmed; Receipt persisted.
- `FAILED` — execution failed; manual intervention required.
- `ESCALATED` — repeated failures; ops alerted.
- `CANCELLED` — superseded by a new PaymentIntent (rare).

---

## ArcScan integration

### Onchain events captured

For every settlement, we capture:

- **USDC `Transfer` events** — one per Payout (or one batch event from Gateway).
- **Arc's native `Receipt` event** — blockNumber, blockHash, gasUsed, effectiveGasPrice.
- **Custom `CitationPaid` event** (Phase 7+) — emitted by `CitationReceipt.sol` with `sourceId`, `agentId`, `amount`, `txHash`.

### ArcScan URL construction

```
mainnet:    https://arcscan.app/tx/<txHash>
testnet:    https://testnet.arcscan.app/tx/<txHash>
```

The Network is determined by `Vault.network`; the URL prefix is in env:

```
PE_ARCSCAN_BASE_URL_ARC_TESTNET = "https://testnet.arcscan.app"
PE_ARCSCAN_BASE_URL_ARC_MAINNET = "https://arcscan.app"
```

### ArcScan API

For verified contracts, ArcScan exposes:
- `/api?module=transaction&action=gettxreceiptstatus&txhash=<hash>`
- `/api?module=account&action=tokenbalance&contractaddress=<usdc>&address=<vault>`

We use these to:
- Confirm `txStatus` is `1` (success).
- Fetch onchain vault balances for reconciliation.
- Pull historical logs for reconciliation backfills.

API key required (set in `PE_ARCSCAN_API_KEY`).

---

## Hash chain

Every Receipt carries a `hash` field:

```
hash_n = sha256( prevHash_n || canonical(receipt_n) )
```

where `canonical(receipt_n)` is the JSON-canonicalized representation of the Receipt body.

### Genesis

```
Receipt_0.prevHash = "0x0000000000000000000000000000000000000000000000000000000000000000"
Receipt_0.hash     = sha256( prevHash_0 || canonical(receipt_0) )
```

### Verification

```
For receipts in order:
  If receipt_n.prevHash != receipt_{n-1}.hash:
    raise ChainBrokenError("chain break at receipt <n>")
```

The Indexer worker runs this verification continuously. Any break pages the on-call.

### Append-only enforcement

Same as Phase 3's append-only pattern: Postgres triggers reject UPDATE on Receipt rows.

---

## Public verification API

Anyone (no auth) can verify a Receipt:

```
GET /v1/receipts/{id}
GET /v1/receipts/by-tx/{txHash}
GET /v1/receipts/by-citation/{citationId}
```

Response:

```json
{
  "id": "rcpt_01HXY...",
  "paymentIntentId": "pi_01HXY...",
  "txHash": "0xabc...",
  "arcScanUrl": "https://testnet.arcscan.app/tx/0xabc...",
  "blockNumber": 12345,
  "blockTimestamp": "2026-06-30T22:00:00Z",
  "status": "SETTLED",
  "totalAtomic": "1000000",
  "feeAtomic": "5000",
  "netAtomic": "995000",
  "payouts": [
    { "vaultId": "vlt_...", "amountAtomic": "700000", "splitsHash": "..." },
    { "vaultId": "vlt_...", "amountAtomic": "295000", "splitsHash": "..." }
  ],
  "treasuryPayout": { "amountAtomic": "5000" },
  "hash": "0x...",
  "prevHash": "0x...",
  "settledAt": "2026-06-30T22:00:00Z"
}
```

### Independent verification

Anyone can paste `txHash` into ArcScan and confirm:
- The transaction succeeded.
- The `from` is the agent's hot wallet.
- The `to` includes the Creator's vault(s).
- The `value` matches `netAtomic + feeAtomic`.

---

## Indexing + mirroring

The Indexer worker (a BullMQ consumer of `payment.settled` events) maintains:

- `Creator.totalEarnedUsdc` — running sum
- `Source.earnedAtomic` — per-Source earnings
- `AnalyticsRollup` rows — protocol-wide metrics
- Public dashboard cache (60s TTL)
- Outbound webhook deliveries (per subscription)

The Indexer is **eventually consistent** with Arc L1. A separate reconciler (cron) reconciles drift:

```
every 60 min:
  for each Receipt in last 24h:
    onchainBalance = arcScan.balanceOf(vault.address)
    localBalance   = sum(receipts for vault in last 24h)
    if abs(onchainBalance - localBalance) > $0.01:
      alert("reconciliation drift for vault <vlt_id>")
```

---

## Auditor replay

Given a Citation ID, an auditor can:

1. **Fetch the Citation.** `GET /v1/citations/{id}` returns full evidence + scoring.
2. **Fetch the Contribution.** `GET /v1/citations/{id}` includes the linked Contribution + `contributionFraction` + `payoutAmountUsdc`.
3. **Fetch the PaymentIntent.** `GET /v1/payments/intents/{paymentIntentId}` returns the full allocation.
4. **Fetch the Receipt.** `GET /v1/receipts/{paymentIntentId}` returns the onchain receipt.
5. **Verify onchain.** Paste `txHash` into ArcScan; confirm USDC `Transfer` events match the payouts.

The total time-to-verify for a single Citation is ~30 seconds.

---

## Receipt schema

```typescript
type Receipt = {
  id: string;                  // "rcpt_<ulid>"
  paymentIntentId: string;
  agentId: string;
  network: WalletNetwork;

  // Onchain anchoring
  txHash: string;
  blockNumber: bigint;
  blockTimestamp: Date;
  blockHash: string;
  arcScanUrl: string;

  // Settlement
  status: "BROADCAST" | "SETTLED" | "FAILED" | "ESCALATED";
  totalAtomic: string;
  feeAtomic: string;
  netAtomic: string;
  payouts: ReceiptPayout[];
  treasuryPayout: { vaultId: string; amountAtomic: string };

  // x402 envelope
  x402Envelope: Json;
  x402EnvelopeHash: string;

  // Hash chain
  prevHash: string;
  hash: string;

  // Audit trail
  gatewayBatchId: string;
  retryAttempts: number;
  settledAt?: Date;
  failedAt?: Date;
  failureReason?: string;

  // Indexing
  indexedAt?: Date;

  // Versioning
  policyVersion: string;

  createdAt: Date;
  updatedAt: Date;  // only updated by append-only supersede logic
};

type ReceiptPayout = {
  vaultId: string;
  walletAddress: string;
  amountAtomic: string;
  splitsHash: string;     // hash of the frozen splits config
  usdcTransferEventIndex: number;  // log index in the Arc tx
};
```

---

## UI integration

### Creator dashboard

For every Creator, the dashboard renders:
- Total USDC earned (sum of settled Receipts).
- Per-Source breakdown.
- Last 30 Receipts with ArcScan links.
- Real-time updates via SSE (Phase 6+).

### Agent dashboard

For every agent, the dashboard renders:
- Total USDC spent (sum of agent's PaymentIntents).
- Per-period breakdown.
- Last 100 Receipts with ArcScan links.
- Hot-wallet balance + drain protection warnings.

### Public site

The public site (`/analytics` page) renders:
- Protocol-wide totals (USDC paid, count of payouts).
- Top 10 Sources by USDC earned.
- Live feed of latest Receipts (anonymized to Creator + amount + source + txHash).

Every Receipt on the public site has a "View on ArcScan" button → opens the canonical ArcScan page.

---

## See also

- [`payment-engine.md`](./payment-engine.md)
- [`settlement-arc.md`](./settlement-arc.md)
- [`payment-audit.md`](./payment-audit.md)
- [`protocol-spec.md`](./protocol-spec.md)