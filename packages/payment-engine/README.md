# @nanoproof/payment-engine

> Execute citation-level USDC nanopayments on Arc L1 via Circle Gateway + x402.

[![Status: Pre-Alpha](https://img.shields.io/badge/status-pre--alpha-orange.svg)]()

The Payment Engine takes a stream of `CitationEvent`s, computes a per-source payout, batches them through Circle Gateway, and settles the final amount on Arc — all under 2 seconds end-to-end.

---

## Status

**Phase 5 — Payment Engine** (planned). The interface is sketched here. Implementation lands alongside Phase 5 of the [Roadmap](../../ROADMAP.md).

---

## The flow

```
CitationEvent stream
    │
    ▼
[1] Quote ──────────────────► per-source price × relevance × cap
    │
    ▼
[2] Aggregate ──────────────► PaymentIntent(creator, period, total)
    │
    ▼
[3] Sign x402 envelope ─────► HTTP 402 challenge, off-chain USDC auth
    │
    ▼
[4] Batch via Gateway ──────► Circle Gateway batches micro-payouts
    │
    ▼
[5] Settle on Arc ──────────► USDC.transfer() · <500ms finality
    │
    ▼
[6] Record receipt ─────────► LedgerEntry(txHash, amount, sources)
```

---

## Pricing model

The engine computes per-citation payouts from a transparent formula:

```
payout(source, citation) = basePrice[source]
                         × relevanceMultiplier[citation]   // 0.5–2.0
                         × periodCapFactor                 // 0.5–1.0 as cap nears
```

- **basePrice** is set by the creator (default $0.001/citation).
- **relevanceMultiplier** comes from the Citation Engine.
- **periodCapFactor** decays once the source hits its per-period cap, so a runaway agent doesn't bankrupt a creator's allowance.
- **Minimum payout** $0.0001 — sub-floor citations accumulate as creator credit.

---

## Planned API

```typescript
import { PaymentEngine } from "@nanoproof/payment-engine";

const engine = new PaymentEngine({
  circle: circleClient,
  gateway: gatewayClient,
  arc: arcClient,
});

const intent = await engine.createIntent({
  creatorId: "cr_01H...",
  citations: [...events],
});

const receipt = await engine.execute(intent);
// {
//   paymentIntentId,
//   txHash,                  // Arc tx hash
//   arcScanUrl,
//   settledAt,
//   breakdown: [
//     { sourceId, amount, citationsCount, txHash }
//   ]
// }
```

---

## Idempotency

Every `PaymentIntent` carries a UUID. Re-submitting the same intent never double-pays — the engine returns the original receipt. This is non-negotiable for production safety.

---

## Batch + Gas economics

| Scenario | Per-payment cost | Per-creator overhead |
|----------|------------------|----------------------|
| Single citation | ~$0.001 in gas + amount | $0 |
| 100 citations, 1 creator | ~$0.001 (Gateway batched) | $0 |
| 100 citations, 50 creators | ~$0.005 (Gateway batched) | $0.0001/creator |
| 1,000 citations, 200 creators | ~$0.01 | $0.0001/creator |

Gateway batching makes the marginal cost per citation negligible at scale.

---

## Failure modes

| Failure | Behavior |
|---------|----------|
| Gateway timeout | Retried 3× with exponential backoff |
| Arc RPC error | Retried with failover RPC |
| Insufficient agent balance | Intent paused, SDK surfaces `INSUFFICIENT_BALANCE` error |
| Smart contract revert | Receipt marked `failed`, no funds moved |
| Partial batch failure | Engine re-queues failed portion, returns success on the rest |

Every failure emits a structured error and a webhook event for the dashboard.

---

## Package shape (planned)

```
@nanoproof/payment-engine
├── src/
│   ├── engine.ts             # PaymentEngine top-level
│   ├── pricing/              # quote, aggregate, cap logic
│   ├── batching/             # Circle Gateway integration
│   ├── x402/                 # x402 sign + verify
│   ├── arc/                  # Arc L1 client (viem-based)
│   ├── receipts/             # LedgerEntry builder, ArcScan URL
│   ├── errors/               # typed error catalog
│   └── types.ts
├── tests/
│   ├── unit/
│   ├── integration/          # live testnet flows
│   └── fixtures/
└── README.md
```

---

## Observability

Every execution emits structured events:

```typescript
{
  event: "payment.intent.created",
  paymentIntentId: "...",
  creatorId: "...",
  citationsCount: 4,
  amount: 0.0041,
}

{
  event: "payment.batch.settled",
  paymentIntentId: "...",
  txHash: "0x...",
  arcScanUrl: "https://testnet.arcscan.app/tx/0x...",
  settledAt: "2026-06-30T21:43:12Z",
}
```

Shipped to Axiom + Sentry in production.

---

## See also

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md#layer-6--payment-engine) — design overview
- [`ROADMAP.md`](../../ROADMAP.md#phase-5--payment-engine) — Phase 5 plan
- [`contracts/`](../../contracts/) — onchain PaymentRouter + Receipt contract
- [`@nanoproof/citation-engine`](../citation-engine/README.md) — upstream producer

---

## License

MIT — see [`LICENSE`](../../LICENSE).