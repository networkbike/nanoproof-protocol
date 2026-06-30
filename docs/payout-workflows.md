# Payout Workflows

> End-to-end flows for every kind of payment NanoProof processes. From Citation to settled Receipt, from clawback to treasury withdrawal — every workflow is documented, idempotent, and retryable.

---

## Table of contents

- [Workflow 1 — Standard payout](#workflow-1--standard-payout)
- [Workflow 2 — Split payout (co-authors)](#workflow-2--split-payout-co-authors)
- [Workflow 3 — Organization payout](#workflow-3--organization-payout)
- [Workflow 4 — Recursive royalty payout](#workflow-4--recursive-royalty-payout)
- [Workflow 5 — Capped payout (period cap)](#workflow-5--capped-payout-period-cap)
- [Workflow 6 — Disputed payout (held)](#workflow-6--disputed-payout-held)
- [Workflow 7 — Quarantined payout (fraud)](#workflow-7--quarantined-payout-fraud)
- [Workflow 8 — Failed payout (recovery)](#workflow-8--failed-payout-recovery)
- [Workflow 9 — Clawback](#workflow-9--clawback)
- [Workflow 10 — Rebate](#workflow-10--rebate)
- [Workflow 11 — Treasury withdrawal](#workflow-11--treasury-withdrawal)
- [Workflow 12 — Hot wallet refill](#workflow-12--hot-wallet-refill)
- [Retry semantics](#retry-semantics)
- [Idempotency keys](#idempotency-keys)
- [See also](#see-also)

---

## Workflow 1 — Standard payout

**Trigger:** Citation Event from Citation Engine.
**Participants:** Agent hot wallet → Creator vault → Treasury vault.

```
1. CitationEngine emits citation.recorded (with paymentQuote: amountAtomic, creatorId).
2. BullMQ worker consumes event.
3. Aggregator: creates PaymentIntent with idempotencyKey = sha256(creatorId || periodStart || periodEnd).
4. Allocator: splits netAtomic per vault (default: 100% to Creator's primary vault).
5. Quoter: signs PaymentQuote offchain (EIP-712).
6. Signer: wraps quote in x402 envelope.
7. BatchScheduler: queues for next 5min batching window.
8. At window end: Gateway client submits batch.
9. Arc RPC: tx submitted, finality confirmed (<500ms).
10. Receipt writer: persists Receipt with hash chain.
11. Indexer: mirrors to public dashboard + analytics.
12. Webhook dispatcher: notifies agent + creator.
```

**Latency:** ≤ 1.3 s from batch-start to settled Receipt.

**Receipt:**
```
{
  totalAtomic: "1000000",
  feeAtomic: "5000",
  netAtomic: "995000",
  creatorPayout: [{ vaultId: "vlt_...", amountAtomic: "995000" }],
  treasuryPayout: { amountAtomic: "5000" }
}
```

---

## Workflow 2 — Split payout (co-authors)

**Trigger:** Citation to a Source with `pricing.splits[]`.
**Participants:** Agent hot wallet → Multiple Creator/Co-author vaults.

```
1-7. Same as Workflow 1 until step 8.
8. Allocator computes per-split amounts:
     payout_i = netAtomic × splits[i].basisPoints / 10000
9. Batch contains N USDC.transfers (one per split destination).
10. Arc settles atomically via Gateway batch.
11. Receipt lists each split's vault + amount + splitsHash.
```

**Receipt:**
```
{
  totalAtomic: "1000000",
  feeAtomic: "5000",
  netAtomic: "995000",
  creatorPayouts: [
    { vaultId: "vlt_main",      amountAtomic: "696500", splitsHash: "0xabc" },  // 70%
    { vaultId: "vlt_coauthor1", amountAtomic: "248750", splitsHash: "0xabc" },  // 25%
    { vaultId: "vlt_coauthor2", amountAtomic: "49750",  splitsHash: "0xabc" }   // 5%
  ]
}
```

Σ payouts (996,500) = 995,000 + 1,500 rounding remainder. Remainder accumulates as protocol credit.

---

## Workflow 3 — Organization payout

**Trigger:** Citation to a Source with `organizationId`.
**Participants:** Agent → Multiple Org-member vaults (per role policy).

```
1-7. Same as Workflow 1 until step 8.
8. Allocator looks up OrganizationMembership for the Source's Creator.
9. Apply Org's defaultSplitPolicy (OWNER %, ADMIN %, etc.).
10. Compute per-member amounts.
11. Same batching + settlement.
```

**Example:**
Org "Open Research Lab" with policy { OWNER: 60%, ADMIN: 40% }:
- Alice (OWNER) → 60% × netAtomic
- Bob (ADMIN) → 40% × netAtomic
- Carol (MEMBER) → 0%

Carol can claim a Source explicitly (overrides org default) — see Workflow 2.

---

## Workflow 4 — Recursive royalty payout

**Trigger:** Citation to a Source that itself cites other registered Sources.
**Participants:** Agent → Parent Creator + Sub-Source Creators.

```
1-7. Same as Workflow 1 until step 8.
8. Allocator identifies sub-Sources (Source.recursiveSubSources[]).
9. For each sub-Source, compute sub-allocation:
     subAmount = netAtomic × compositionFeeBps / 10000 × sub.attributionFraction
10. Parent Creator receives remainder:
     parentAmount = netAtomic - sum(subAmounts)
11. Same batching + settlement (with extra payout rows).
```

**Limits:** Max recursion depth = 3 (configurable).

---

## Workflow 5 — Capped payout (period cap)

**Trigger:** Source has `periodCap` configured; cumulative payouts in period would exceed cap.
**Participants:** Same as standard, but the excess is **deferred**.

```
1-7. Same as Workflow 1 until step 8.
8. Aggregator checks Source.periodCap and Creator's per-period cumulative payouts.
9. If within cap: pay normally.
   If over cap: mark Payout.payoutStatus = CAPPED, accumulate as creator credit.
10. At period end: pay accumulated credit on next batching window.
```

**Capped receipts** still emit, but `payoutStatus = CAPPED`:
```
{
  payoutStatus: "CAPPED",
  amountAtomic: "0",  // this period
  creditAtomic: "1500",  // accumulated for next period
}
```

The Creator's dashboard renders the cap utilization + pending credit.

---

## Workflow 6 — Disputed payout (held)

**Trigger:** Creator files `POST /v1/citations/:id/dispute`.
**Participants:** No onchain activity until resolution.

```
1. Creator files dispute.
2. PaymentEngine freezes the corresponding Contribution + Payout.
3. If Payout was already settled: opens a 7-day clawback window.
4. If Payout was pre-settlement: marks FROZEN, does NOT include in next batch.
5. Ops reviews within 5 business days.
6. Resolution:
   a. PAYOUT_RELEASE → unfreeze; include in next batch.
   b. PAYOUT_RETAIN → permanently retain credit for Creator (no payout).
   c. PAYOUT_REVERSE → clawback if settled.
7. All transitions logged with operator ID + reasoning.
```

---

## Workflow 7 — Quarantined payout (fraud)

**Trigger:** Citation with `fraudRiskScore > 0.7` from Phase 3.
**Participants:** No automatic payout.

```
1. Citation Engine marks Citation.fraudRiskScore.
2. Payment Engine excludes quarantined Citations from PaymentIntents.
3. Quarantined Citations live in a separate queue.
4. Ops reviews (or auto-releases if score decays below threshold).
5. Manual decision: RELEASE | REVERSE | PERMANENT_HOLD.
6. Audit trail with operator ID.
```

---

## Workflow 8 — Failed payout (recovery)

**Trigger:** PaymentIntent execution fails (Arc revert, RPC timeout, etc.).
**Participants:** Same as standard, with retry logic.

```
1. PaymentIntent.status = SIGNED → BROADCAST.
2. Arc RPC submits tx.
3. Failure detected (revert, timeout, etc.).
4. Mark Payout.status = FAILED with reason.
5. Retry queue: schedule retry on next batching window.
6. Max retries: 3 (configurable).
7. After 3 failures: status = ESCALATED; ops alerted.
8. Manual intervention: ops can REPLAY or CANCEL.
```

---

## Workflow 9 — Clawback

**Trigger:** Dispute resolved with PAYOUT_REVERSE (post-settlement).
**Participants:** Treasury vault ← Creator vault (Creator must cooperate OR legal escalation).

```
1. Dispute resolves PAYOUT_REVERSE.
2. Payment Engine checks if Creator's vault has approved the protocol as a USDC spender.
   a. If yes: USDC.transferFrom(creatorVault, treasuryVault, amount).
   b. If no: queue for cooperative clawback (Creator signs manually).
3. TreasuryTransaction of type CLAWBACK recorded.
4. Source.earnedAtomic decremented.
5. Creator's net lifetime earnings recomputed.
6. Public dashboard reflects the clawback.
```

**Note:** Cooperative clawback is the standard. Non-cooperative clawback is rare and escalates to governance.

---

## Workflow 10 — Rebate

**Trigger:** Month-end.
**Participants:** Treasury vault → Agent hot wallet.

```
1. Cron at 00:00 UTC on the 1st of each month.
2. For each agent:
     a. Compute prior month totalVolume.
     b. Compute average feeBps applied.
     c. Compare to current tier's feeBps.
     d. If eligible for rebate: compute rebateAtomic.
3. Create RebatePaymentIntent per eligible agent.
4. Execute via standard batching flow.
5. Agent receives rebate in their hot wallet.
```

**Receipt:**
```
{
  type: "REBATE",
  paymentIntentId: "pi_rebate_...",
  agentId: "agent_...",
  amountAtomic: "12500",
  reason: "Volume tier upgrade (Growth → Scale)"
}
```

---

## Workflow 11 — Treasury withdrawal

**Trigger:** Operator initiates a manual outflow (operational expense, grant, etc.).
**Participants:** Multisig signers.

```
1. Operator POSTs /v1/treasury/withdrawals with { amount, recipient, reason }.
2. WithdrawalRequest created with status = PENDING.
3. Other signers review via dashboard.
4. Each signer submits signature via /v1/treasury/withdrawals/:id/sign.
5. When threshold met, Safe transaction executes.
6. WithdrawalRequest.status = EXECUTED.
7. TreasuryTransaction of type WITHDRAWAL recorded.
```

**Threshold:** 3-of-5 for expenses < $10k, 5-of-5 for ≥ $10k.

---

## Workflow 12 — Hot wallet refill

**Trigger:** Hot wallet balance below threshold.
**Participants:** Treasury vault → Agent hot wallet (automated).

```
1. Cron runs every 5 min.
2. Reads hotWallet.balance via Arc RPC.
3. If balance < REFILL_THRESHOLD ($5,000):
     a. Compute refill amount.
     b. Build Safe transaction (USDC.transfer(hotWallet, amount)).
     c. Safe auto-executes via automation role (no multisig signature required).
4. TreasuryTransaction of type TOPUP recorded.
5. Hot wallet ready for next batching window.
```

---

## Retry semantics

| Failure | Retry behavior |
|---------|----------------|
| Arc RPC timeout | Retry once on same RPC, then failover to backup RPC |
| Arc revert | Do NOT retry; mark FAILED with revert reason |
| Gateway 5xx | Retry 3× with exponential backoff (1s, 5s, 30s) |
| Gateway timeout | Retry once; on second timeout, fall back to direct viem settlement |
| Indexer failure | Retry on restart; reconciler backfills |
| Webhook delivery failure | Retry with exponential backoff (1m, 5m, 30m, 2h, 12h) |

---

## Idempotency keys

Every state-changing operation has an `idempotencyKey`:

| Operation | Key derivation |
|-----------|----------------|
| `POST /v1/citations/record` | `sha256(responseId)` (from Phase 3) |
| `PaymentIntent.create` | `sha256(creatorId \|\| periodStart \|\| periodEnd)` |
| `Payout.execute` | `sha256(paymentIntentId \|\| vaultId)` |
| `Receipt.settle` | `sha256(prevReceiptHash \|\| canonical(receipt))` |
| `Webhook.deliver` | `sha256(eventId \|\| subscriberId)` |
| `Rebate.execute` | `sha256(agentId \|\| month \|\| tierAtMonthEnd)` |

Re-submitting the same key returns the cached response without re-executing.

---

## Operational metrics

For each workflow, we track:

- **Throughput** — events/hour
- **Latency p50, p99** — end-to-end
- **Success rate** — settled / submitted
- **Failure rate by reason** — revert, timeout, etc.
- **Retry distribution** — 1 retry, 2 retries, etc.

See [`analytics.md`](./analytics.md) for the full metric set.

---

## See also

- [`payment-engine.md`](./payment-engine.md)
- [`settlement-arc.md`](./settlement-arc.md)
- [`creator-vaults.md`](./creator-vaults.md)
- [`revenue-allocation.md`](./revenue-allocation.md)
- [`fee-structure.md`](./fee-structure.md)
- [`payment-audit.md`](./payment-audit.md)
- [`treasury-management.md`](./treasury-management.md)
- [`fraud-prevention.md`](./fraud-prevention.md)
- [`../runbooks/`](../runbooks/)