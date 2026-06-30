# Payment Engine

> The Payment Engine turns CitationEvents into onchain USDC payouts to Creator vaults on Arc. It is the financial core of NanoProof.

---

## Table of contents

- [Purpose](#purpose)
- [Design principles](#design-principles)
- [Architecture at a glance](#architecture-at-a-glance)
- [The 8-stage payout pipeline](#the-8-stage-payout-pipeline)
- [Components](#components)
- [Settlement model](#settlement-model)
- [Creator vaults](#creator-vaults)
- [Revenue allocation](#revenue-allocation)
- [Arc-native settlement](#arc-native-settlement)
- [ArcScan verification](#arcscan-verification)
- [Audit trail](#audit-trail)
- [Treasury management](#treasury-management)
- [Fee structure](#fee-structure)
- [Fraud controls](#fraud-controls)
- [Latency budget](#latency-budget)
- [Failure modes](#failure-modes)
- [Configuration](#configuration)
- [Acceptance criteria](#acceptance-criteria)
- [See also](#see-also)

---

## Purpose

The Payment Engine answers one question with mathematical precision:

> For a batch of CitationEvents, who is owed what, when, and how do we prove the payment settled?

Every Citation the Citation Engine emits is a **claim** on USDC. The Payment Engine:

1. **Aggregates** claims into PaymentIntents (per-Creator, per-period).
2. **Allocates** each PaymentIntent across the Creator's vault(s) per the source's royalty splits.
3. **Quotes** the total USDC amount in atomic units.
4. **Sign**s an x402 envelope offchain.
5. **Batch**es the payouts through Circle Gateway.
6. **Settle**s on Arc L1 in a single transaction per batch.
7. **Anchor**s a tamper-evident Receipt on ArcScan.
8. **Mirrors** the Receipt to the public ledger + Indexer.

Every step is auditable. Every dollar is traceable. Every payout has a public receipt.

---

## Design principles

1. **Creators are non-custodial.** No NanoProof-controlled wallet ever holds creator funds for longer than the settlement batch window.
2. **Deterministic payouts.** Given the same CitationEvents, the engine must produce the same PaymentIntents, Quotes, and Settlements. Idempotency keys guarantee replay safety.
3. **Append-only ledger.** PaymentIntent, Payout, Receipt rows are never UPDATEd. State changes happen via supersede rows.
4. **Defense in depth.** Per-agent caps, per-source caps, escrow, fraud quarantine, dispute freeze, multisig, KMS — every layer defends the next.
5. **Public by default.** Every settled Receipt is publicly viewable on ArcScan. The dashboard renders the same data.
6. **Cost-efficient at scale.** One Arc transaction settles up to 1000 payouts via Circle Gateway. Per-payout gas amortizes to <$0.0001.

---

## Architecture at a glance

```
            ┌──────────────────────────────────────────────────────┐
            │                  CITATION ENGINE                     │
            │   emits citation.recorded events with Quotes         │
            └──────────────────────────┬───────────────────────────┘
                                       │  CitationEvent[]
                                       ▼
            ┌──────────────────────────────────────────────────────┐
            │                  PAYMENT ENGINE                      │
            │  ┌──────────────────────────────────────────────┐    │
            │  │  1. Aggregate       (CitationEvent → PI)     │    │
            │  │  2. Allocate        (PI × splits → Vault[])   │    │
            │  │  3. Quote           (atomic USDC)             │    │
            │  │  4. Sign x402       (off-chain auth)          │    │
            │  │  5. Batch           (Gateway)                 │    │
            │  │  6. Settle on Arc   (USDC.transfer x N)       │    │
            │  │  7. Anchor Receipt  (ArcScan txHash)          │    │
            │  │  8. Mirror          (Indexer + Public API)    │    │
            │  └──────────────────────────────────────────────┘    │
            └──────────────────────────┬───────────────────────────┘
                                       │  Receipt
                                       ▼
            ┌──────────────────────────────────────────────────────┐
            │                  ARCANALYTICS + ARC L1               │
            │   public dashboard + ArcScan-verifiable receipts    │
            └──────────────────────────────────────────────────────┘
```

The Payment Engine is **read-mostly** with respect to the registry. It owns the `payment_intents`, `payouts`, `receipts`, `vaults`, `fees`, `treasury_*` tables.

---

## The 8-stage payout pipeline

### Stage 1 — Aggregate

**Inputs:** Stream of `CitationEvent` from the Citation Engine (via EventEmitter or webhook).

**Outputs:** `PaymentIntent` rows.

A `PaymentIntent` represents the **total amount one Creator is owed for one batching period**, computed as:

```
PaymentIntent.creatorId       = creator_id
PaymentIntent.periodStart     = period_start  // rounded to nearest batching window
PaymentIntent.periodEnd       = period_end
PaymentIntent.totalAtomic     = Σ citation.payoutAmountUsdc for citations in period
PaymentIntent.status          = PENDING | SIGNED | SETTLED | FAILED | ESCALATED
PaymentIntent.idempotencyKey  = sha256(creatorId || periodStart || periodEnd)
```

Aggregation is **idempotent**: replaying the same CitationEvent stream produces the same PaymentIntent (no double-pay).

Default batching window: **5 minutes** (configurable; in production we'd batch to 1h for fewer transactions).

### Stage 2 — Allocate

**Inputs:** A `PaymentIntent` + the Creator's `pricing.splits[]` and any `OrganizationMembership` rules.

**Outputs:** A list of `Payout` rows — one per destination vault.

```
For each Payout in PaymentIntent:
  Payout.amountAtomic   = splitBasisPoints(vault, totalAtomic, splits[])
  Payout.vaultId        = vault.id
  Payout.idempotencyKey = sha256(paymentIntentId || vaultId)
```

Allocation is deterministic. Splits are summed in basis points (0-10000) and must total 10000.

### Stage 3 — Quote

**Inputs:** A list of `Payout` rows.

**Outputs:** A signed `PaymentQuote` — an authoritative promise to pay.

```
PaymentQuote {
  paymentIntentId
  totalAtomic         // Σ payouts
  feeAtomic           // protocol fee, see fee-structure.md
  netAtomic           // totalAtomic - feeAtomic
  payouts             // [{ vaultId, amountAtomic, splitsHash }]
  validUntil          // ISO timestamp, typically periodEnd + 60s
  signature           // agent hot wallet signs the canonical quote
}
```

The quote is an offchain signed message. It does not yet move funds.

### Stage 4 — Sign x402 envelope

The Payment Engine wraps the PaymentQuote in an [x402](https://www.x402.org/) envelope:

```
x402 Envelope:
  challenge:  HTTP 402 Payment Required
  resource:   nanoproof://payment-intents/<id>
  quote:      PaymentQuote
  payer:      <agent hot wallet address>
  payees:     [<vault address>, ...]
  amount:     totalAtomic
  currency:   USDC
  signature:  EIP-712 over (resource, quote, payer, amount, currency)
```

x402 is the open standard for HTTP-native payments. Wrapping NanoProof payouts in x402 means:
- Standard tooling can read our receipts.
- Future cross-protocol compositions become trivial.
- The offchain auth layer is portable.

### Stage 5 — Batch via Circle Gateway

The Payment Engine submits the x402 envelope to **Circle Gateway**, which batches up to 1000 payouts into a single onchain settlement.

Gateway batching reduces the marginal onchain cost per payout to **< $0.0001 USDC** in gas (paid in USDC).

### Stage 6 — Settle on Arc

Circle Gateway produces a single `BatchSettlement` transaction on Arc L1:

```
BatchSettlement {
  txHash          // Arc tx hash, e.g. 0xabc123...
  blockNumber     // Arc block height
  blockTimestamp  // ISO
  batchId         // Gateway-assigned batch id
  payouts         // N x USDC.transfer(agentHotWallet, vaultAddress, amount)
  totalAtomic     // Σ amount
  feeAtomic       // protocol fee
  netAtomic       // totalAtomic - feeAtomic
}
```

Arc's <500ms finality means the Receipt is canonical within 1 block of broadcast.

### Stage 7 — Anchor Receipt

A `Receipt` row is created on Arc with `txHash`, `blockNumber`, `payouts[]`, and a SHA-256 hash of the canonical PaymentIntent. The Receipt's `arcScanUrl` is constructed:

```
https://arcscan.app/tx/<txHash>      // mainnet
https://testnet.arcscan.app/tx/<txHash>   // testnet
```

Every Receipt carries:
- `paymentIntentId`
- `txHash`
- `arcScanUrl`
- `blockTimestamp`
- `batchId`
- `hash` — sha256 of the canonical Receipt body
- `prevHash` — the hash of the prior Receipt (tamper-evident chain)

### Stage 8 — Mirror

The Indexer worker consumes `payment.settled` events and updates:
- `Creator.totalEarnedUsdc`
- `Source.citationCount`, `Source.earnedAtomic`
- `AnalyticsRollup` rows
- The public dashboard cache
- Optional outbound webhooks to subscribed agents/creators

---

## Components

| Component | File | Purpose |
|-----------|------|---------|
| **Aggregator** | `core/aggregator.ts` | CitationEvents → PaymentIntent |
| **Allocator** | `allocation/allocator.ts` | Apply splits, generate Payout rows |
| **Quoter** | `core/quoter.ts` | Sign the PaymentQuote |
| **Signer** | `x402/signer.ts` | Wrap quote in x402 envelope |
| **Gateway client** | `settlement/gateway-client.ts` | Submit batch to Circle Gateway |
| **Arc client** | `settlement/arc-client.ts` | viem-based Arc RPC + finality polling |
| **Receipt writer** | `receipts/receipt-writer.ts` | Persist Receipt with hash chain |
| **Indexer** | `settlement/indexer.ts` | Mirror to public ledger + dashboards |
| **Vault manager** | `vaults/vault-manager.ts` | Creator vault CRUD |
| **Treasury manager** | `treasury/treasury-manager.ts` | Protocol fee accrual + admin ops |
| **Fee calculator** | `fees/fee-calculator.ts` | Compute protocol fees per quote |
| **Fraud gate** | `core/fraud-gate.ts` | Re-check fraud signals pre-execution |
| **Retry scheduler** | `core/retry-scheduler.ts` | BullMQ retry orchestration |
| **Reconciler** | `core/reconciler.ts` | Periodic Arc state vs. local state |

Each component exposes a typed interface and is independently testable.

---

## Settlement model

NanoProof uses a **push** settlement model: every Citation triggers an eventual outbound USDC payment to the Creator's vault. This is the inverse of a "pull" model where the Creator would have to claim accumulated balances.

### Push vs. Pull

| Aspect | Push (NanoProof) | Pull (traditional) |
|--------|------------------|--------------------|
| UX | Creator's balance grows automatically | Creator must withdraw manually |
| Gas efficiency | Batched (1000 payouts per tx) | Each withdrawal is a separate tx |
| Custody risk | Funds settle to Creator's wallet directly | Funds held by intermediary |
| Reversibility | Hard to reverse without clawback window | Trivial (intermediary can hold) |
| UX trade-off | Need to explain batching windows | Familiar to crypto users |

We chose **push** because it aligns with NanoProof's "non-custodial by default" principle.

### Batching window

| Window | Use case | Trade-off |
|--------|----------|-----------|
| **5 min** | High-throughput agents | Lower latency, more transactions |
| **1 h** | Default | Balanced |
| **24 h** | Low-volume creators | Cheapest gas, slowest settlement |

The default is 1h. Creators can opt into 5min (extra fee) or 24h (reduced fee).

### Per-payout cost economics

```
batch_cost          = $0.01 USDC (Arc tx, ~$0.005 in gas + $0.005 overhead)
payouts_per_batch   = up to 1000
gas_per_payout      = $0.01 / 1000 = $0.00001
protocol_fee        = 0.5% of payout amount
min_payout          = $0.0001 USDC (100 atomic units)
```

A $0.001 payout costs $0.00001 in gas + $0.000005 in protocol fee = $0.000015. The payout is **98.5% efficient**.

---

## Creator vaults

A Creator's vault is the onchain address that receives USDC payouts. The model is documented in [`creator-vaults.md`](./creator-vaults.md).

Key principles:
- Vault is owned by the Creator's verified wallet (Phase 2 wallet verification).
- Vault can be a smart contract (e.g. Gnosis Safe, multisig) for sophisticated Creators.
- Vault can have multiple destinations via splits (co-authors, Organization).
- Vault balance is **non-custodial** from the moment of settlement.

Three vault modes:
1. **Simple wallet** — single destination, default.
2. **Split-configured** — fixed basisPoints allocation across multiple addresses.
3. **Programmable** — smart-contract vault with custom routing logic.

---

## Revenue allocation

Documented in [`revenue-allocation.md`](./revenue-allocation.md). Summary:

1. **Default:** 100% to Creator's primary vault.
2. **Co-author splits:** Creator-configured basisPoints per wallet.
3. **Organization splits:** per role (OWNER/ADMIN share, MEMBER doesn't).
4. **Recursive royalties:** sub-Source creators receive a share when a parent Source is cited.
5. **Protocol fee:** deducted from the total before allocation.

Allocation is **pure** — every USDC of `totalAtomic` is accounted for exactly once across the resulting `Payout` rows.

---

## Arc-native settlement

Documented in [`settlement-arc.md`](./settlement-arc.md). Summary:

- Arc L1 is the **only** settlement chain at v1.0.
- USDC is the **only** settlement currency.
- Native USDC gas (no separate native token).
- <500ms finality.
- Arc RPC + ArcScan + Arc faucet integration.
- v2.0 introduces chain-portability per ADR-0001.

---

## ArcScan verification

Documented in [`arcscan-verification.md`](./arcscan-verification.md). Summary:

- Every settled Receipt carries an ArcScan URL.
- Receipts are hash-chained: `hash_n = sha256(prevHash_n || canonical(receipt_n))`.
- Public dashboard renders the same Receipt data.
- Discrepancies between local and onchain state trigger reconciliation.

---

## Audit trail

Documented in [`payment-audit.md`](./payment-audit.md). Summary:

- Every state change emits a structured event (signed).
- All rows are append-only with hash chains.
- Per-Citation replay: re-run the Attribution + Payout from stored evidence.
- Per-period reconciliation: diff local ledger against Arc L1 state.

---

## Treasury management

Documented in [`treasury-management.md`](./treasury-management.md). Summary:

- Protocol fee accrued to a **treasury vault** owned by a 3-of-5 multisig.
- Agent hot wallet holds operational USDC for batch settlements.
- Hot wallet → KMS migration in Phase 9.
- Treasury reports public.

---

## Fee structure

Documented in [`fee-structure.md`](./fee-structure.md). Summary:

- **Protocol fee:** 0.5% of `totalAtomic`, capped per-PaymentIntent.
- **Gas fee:** paid in USDC, amortized across batch.
- **Batching tier fee:** ±0.1% based on window choice.
- **Volume discounts** for agents with > $10k monthly throughput.

---

## Fraud controls

The Payment Engine respects and enforces the fraud controls from Phase 3:
- **Auto-quarantine** (fraud score > 0.7): Citation's Payout held until manual review.
- **Dispute freeze**: Payout blocked while `Dispute.status = OPEN`.
- **Per-Creator period cap**: pre-checked before signing.
- **Per-Agent period cap**: pre-checked before signing.
- **Idempotency**: re-submitting the same `idempotencyKey` returns the cached Receipt.
- **Replay protection**: Arc tx hash is one-shot; double-spend attempts are rejected.

Additional Payment-Engine-specific defenses:
- **Hot-wallet drain protection**: hard daily cap on `agentHotWallet.balance` (configurable per-agent).
- **Outbound rate limit**: max 100 settlements per agent per hour.
- **Reconciliation alarm**: any drift > $0.01 between local and onchain triggers paging.

---

## Latency budget

| Stage | Target | Notes |
|-------|--------|-------|
| 1. Aggregate | 100 ms | mostly Prisma reads + grouping |
| 2. Allocate | 50 ms | pure compute on splits |
| 3. Quote | 50 ms | EIP-712 sign |
| 4. Sign x402 | 20 ms | envelope wrap |
| 5. Batch (Gateway) | 300 ms | Circle API |
| 6. Settle on Arc | 500 ms | <500ms finality |
| 7. Anchor Receipt | 200 ms | DB write |
| 8. Mirror | 60 ms | EventEmitter + Indexer |
| **Total** | **~1.3 s** | fits the 2 s end-to-end goal |

For the 5min batching window, the Citation → settled Receipt latency is **5 min + 1.3 s ≈ 5 min**, well within the Lepton demo's 2 s budget when measured from batch-start.

---

## Failure modes

| Failure | Behavior |
|---------|----------|
| Gateway 5xx | Retry 3× with backoff; mark PaymentIntent `ESCALATED`; alert ops |
| Gateway timeout | Retry once; on second timeout, settle onchain directly via viem |
| Arc RPC failure | Failover RPC; if all fail, retry next batching window |
| Arc revert (insufficient hot-wallet balance) | Mark PaymentIntent `FAILED`; surface to agent dashboard; do NOT retry |
| Smart contract revert | Mark PaymentIntent `FAILED`; capture revert reason in Receipt |
| Indexer down | Receipts still settle; Indexer catches up on restart via ArcScan polling |
| Hot wallet compromised | Multisig pause + emergency transfer to cold storage; clawback window opens |
| Insufficient gas | Top-up hot wallet from treasury vault (automated) |

---

## Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `PE_BATCH_WINDOW_SEC` | `300` | Batching window (5 min) |
| `PE_PROTOCOL_FEE_BPS` | `50` | 0.5% in basis points |
| `PE_MIN_PAYOUT_ATOMIC` | `100` | $0.0001 USDC |
| `PE_MAX_BATCH_SIZE` | `1000` | Max payouts per Gateway batch |
| `PE_HOT_WALLET_DAILY_CAP_ATOMIC` | `10000000000` | $10k USDC default |
| `PE_AGENT_HOT_WALLET_PRIVATE_KEY` | — | Signs payments (KMS in Phase 9) |
| `PE_AGENT_HOT_WALLET_ADDRESS` | — | Payer address |
| `PE_TREASURY_VAULT_ADDRESS` | — | Protocol fee destination |
| `PE_ARC_RPC_URL` | — | Primary Arc RPC |
| `PE_ARC_RPC_URL_BACKUP` | — | Failover Arc RPC |
| `PE_ARCSCAN_API_KEY` | — | For verified-receipt indexing |
| `PE_USDC_ARC_ADDRESS` | — | USDC contract on Arc |
| `PE_CIRCLE_API_KEY` | — | Circle Gateway auth |
| `PE_CIRCLE_GATEWAY_URL` | — | Gateway endpoint |
| `PE_RECEIPT_CHAIN_ENABLED` | `true` | Hash-chained Receipts |
| `PE_RECONCILIATION_INTERVAL_MIN` | `60` | How often to reconcile vs. Arc state |

---

## Acceptance criteria

Phase 4 is **done** when:

1. Given a stream of CitationEvents, the engine produces PaymentIntents within one batching window.
2. Splits are honored to the atomic unit.
3. Settlement succeeds on Arc testnet in <2 s end-to-end (excluding batching wait).
4. Every Receipt has a public ArcScan URL.
5. Hash chain validates across all settled Receipts.
6. Reconciliation diff = 0 over a 24h test window.
7. Hot-wallet drain protection triggers at the configured cap.
8. All NP_* error paths exercised in tests.
9. OpenAPI spec serves at `/openapi.yaml` and renders in Swagger UI.

---

## See also

- [`settlement-arc.md`](./settlement-arc.md)
- [`creator-vaults.md`](./creator-vaults.md)
- [`revenue-allocation.md`](./revenue-allocation.md)
- [`arcscan-verification.md`](./arcscan-verification.md)
- [`payment-audit.md`](./payment-audit.md)
- [`treasury-management.md`](./treasury-management.md)
- [`fee-structure.md`](./fee-structure.md)
- [`payout-workflows.md`](./payout-workflows.md)
- [`fraud-prevention.md`](./fraud-prevention.md)
- [`protocol-spec.md`](./protocol-spec.md)