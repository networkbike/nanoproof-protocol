# Payment Audit

> Every payment, every allocation, every settlement is auditable end-to-end. This document defines the audit trail, the replay tooling, and the dispute resolution flow.

---

## Table of contents

- [Purpose](#purpose)
- [Audit trail surfaces](#audit-trail-surfaces)
- [What we record](#what-we-record)
- [Replay toolkit](#replay-toolkit)
- [Period-end reconciliation](#period-end-reconciliation)
- [Dispute resolution](#dispute-resolution)
- [Audit log retention](#audit-log-retention)
- [External auditors](#external-auditors)
- [See also](#see-also)

---

## Purpose

NanoProof handles real money moving to real Creators. Auditing must be:

1. **Complete** — every state change is logged.
2. **Tamper-evident** — append-only + hash chains.
3. **Reconstructable** — given a Citation ID, the full payment path can be replayed.
4. **Externally verifiable** — independent auditors can confirm correctness without trusting NanoProof.

The audit trail also serves **dispute resolution**: when a Creator disputes a Citation, the audit log is the ground truth.

---

## Audit trail surfaces

| Surface | Stored in | Lifetime |
|---------|-----------|----------|
| **Application events** | Axiom logs | 90 days hot, 1 year cold |
| **DB write history** | Postgres `audit_log` table | Forever |
| **Onchain receipts** | Arc L1 | Forever (Arc finality) |
| **Hash-chained Receipts** | Postgres `receipts` table | Forever |
| **ArcScan index** | ArcScan | Forever |
| **Public API mirrors** | Redis cache + CDN | 60s TTL (refreshed from DB) |

---

## What we record

### Per Citation

- Raw text + agent metadata (hashed; PII-safe).
- Detected candidates + match signals.
- Selected Source + Fingerprint.
- Classification + rationale.
- Attribution fraction + raw score breakdown.
- Policy version.

### Per PaymentIntent

- Aggregating Citation IDs.
- Total / fee / net amounts (atomic units).
- Vaults selected + splits configuration (frozen hash).
- Idempotency key.
- Status transitions with timestamps.
- Failed attempts + retry history.

### Per Receipt

- `txHash` + ArcScan URL.
- Block number + timestamp.
- USDC `Transfer` events captured.
- Hash chain links.
- Gateway batch ID.
- Settlement confirmation timing.

### Per Agent

- Hot wallet balance + drain protection state.
- API key + last-used timestamp.
- Per-period spend + cap utilization.
- Reputation score over time.

### Per Creator

- All vaults + splits configurations over time.
- All Receipts received.
- All disputes filed + resolution outcomes.

### Per Operator action

- Treasury withdrawals + multisig signers.
- Fraud quarantine releases.
- Dispute resolutions.
- Threshold tunings (τ, fee rates, etc.).

---

## Replay toolkit

### Per-Citation replay

```bash
pnpm tsx scripts/replay-citation.ts \
  --citation-id cit_01HXY... \
  --policy-version am.v1.0.0
```

The script:
1. Loads the Citation + Evidence.
2. Recomputes attribution under the specified policy version.
3. Loads the Contribution + CreatorMatch + Payout rows.
4. Recomputes the allocation under the frozen splits hash.
5. Compares the recomputed values to the persisted values.
6. Reports any drift.

A passing replay produces a `ReplayedAttribution` object with `verified: true`.

### Per-Period replay

```bash
pnpm tsx scripts/replay-period.ts \
  --creator cr_01HXY... \
  --period-start 2026-06-30T00:00:00Z \
  --period-end 2026-06-30T23:59:59Z
```

The script:
1. Loads all Citations for the Creator in the period.
2. Loads all PaymentIntents for the period.
3. Reconstructs the allocation tree.
4. Cross-checks against the Receipts.
5. Cross-checks against the onchain USDC balances via ArcScan.

A passing period replay produces a `PeriodReconciliationReport`.

### CLI tooling

```
scripts/
├── replay-citation.ts
├── replay-period.ts
├── replay-allocation.ts
├── reconcile-against-arc.ts
├── export-ledger.ts          # CSV / Parquet export
├── verify-hash-chain.ts      # walk the Receipt chain
└── audit-period.sh           # full-period audit (cron-friendly)
```

All scripts are idempotent and safe to run repeatedly.

---

## Period-end reconciliation

Every 60 minutes, the Reconciler runs:

```
For each Vault with activity in last 24h:
  onchainBalance = arcScan.balanceOf(USDC, vault.address)
  localEarned    = Σ Receipts to vault in last 24h
  delta          = onchainBalance - localEarned

  if abs(delta) > 100 atomic units ($0.0001):
    alert("drift detected for vault <id>")
    create Incident(severity: HIGH)
```

### Resolution

| Drift size | Action |
|------------|--------|
| < 100 atomic ($0.0001) | Likely rounding; log + ignore |
| 100 - 10,000 atomic ($0.0001 - $0.01) | Log; auto-investigate |
| > 10,000 atomic ($0.01) | Page on-call; manual investigation |

Common causes:
- Receipt row missing from local DB.
- Arc reorg (extremely rare on Arc).
- Manual creator withdrawal between periods.

### Cold reconciliation (daily)

A separate cron (runs at 03:00 UTC) reconciles the **full** Receipt table against Arc L1, walking back as far as the data goes. This catches drift that builds up over time.

---

## Dispute resolution

Creators can dispute any Citation via `POST /v1/citations/:id/dispute` (from Phase 3). The Payment Engine responds by **freezing the escrow**:

```
Citation.status             → DISPUTED
Contribution.payoutStatus   → DISPUTED
Payout.payoutStatus         → HELD (if not yet settled)
Receipt.payoutStatus        → HELD (if exists)
```

If the PaymentIntent was already settled, the **clawback window** opens (Phase 5: 7 days). Within that window, the protocol can recover funds from the Creator's vault.

### Disputes without onchain dispute

For Phase 9+:

```
1. Creator files dispute via API.
2. Payment Engine freezes payout (pre-settlement) or opens clawback (post-settlement).
3. Ops reviews within 5 business days.
4. Outcome: PAYOUT_RELEASE | PAYOUT_REVERSE | PAYOUT_RETAIN | DISPUTE_WITHDRAW.
5. If PAYOUT_REVERSE: protocol sends reverse transaction to clawback funds.
6. Ledger entry recorded with operator ID + reasoning.
```

All dispute outcomes are public:

```
GET /v1/disputes/{id}
→ includes dispute, citations, resolution, operator, reasoning
```

---

## Audit log retention

| Data | Retention | Rationale |
|------|-----------|-----------|
| Application logs (Axiom) | 90 days hot / 1 year cold | Operational debugging |
| Audit log table (Postgres) | Forever | Compliance + replay |
| Hash-chained Receipts | Forever | Tamper evidence |
| Onchain receipts (Arc) | Forever | Public proof |
| PII (email, name) | Until account deletion + 30 days | GDPR |
| Disputes | Forever | Public record |

GDPR purges redact PII but preserve the financial record (with hashed references to the deleted Creator).

---

## External auditors

External auditors can:

1. **Read the OpenAPI spec** at `/openapi.yaml`.
2. **Replay any Citation** via `POST /v1/attributions/calculate` with the original policy version.
3. **Verify any Receipt** by pasting the `txHash` into ArcScan.
4. **Cross-reference** the local DB hash chain against ArcScan's transaction history.

We do not grant DB access to external auditors; the API is the public contract.

### Periodic external audits

NanoProof commits to:

- **Quarterly smart contract audits** (during public beta + after).
- **Annual financial audits** of the protocol fee accrual + treasury.
- **Public reports** posted to `/docs/audits/`.

---

## Audit-grade data exports

For auditors, we provide bulk exports:

```
GET /v1/audit/export.csv?from=&to=    # all Receipts in a date range
GET /v1/audit/export.parquet?from=&to=
```

Both include:
- Receipt ID, txHash, block, timestamps.
- Amounts (atomic + human-readable USD).
- Vault addresses (full).
- Hash chain links.
- Citation references (no PII).

Auditors can join with their own data to verify Creator and Agent identities.

---

## Operational security

Audit access requires:
- **Operator role** in Clerk.
- **Audit-only API key** (no write capability).
- **Time-bound tokens** — max 24h validity.

All audit queries are logged.

---

## See also

- [`payment-engine.md`](./payment-engine.md)
- [`arcscan-verification.md`](./arcscan-verification.md)
- [`fraud-prevention.md`](./fraud-prevention.md)
- [`../SECURITY.md`](../SECURITY.md)
- [`../runbooks/incident-response.md`](../docs/runbooks/incident-response.md)