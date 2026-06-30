# Fraud Prevention

> The Citation Engine is the most attractive abuse target on the NanoProof protocol. This document is the threat model and the layered defenses that protect creators, agents, and the protocol itself.

---

## Table of contents

- [Threat model](#threat-model)
- [Attack catalog](#attack-catalog)
- [Risk levels](#risk-levels)
- [Layered defenses](#layered-defenses)
- [Per-attack mitigations](#per-attack-mitigations)
- [Detection signals](#detection-signals)
- [Quarantine + dispute flow](#quarantine--dispute-flow)
- [Operational metrics](#operational-metrics)
- [See also](#see-also)

---

## Threat model

Adversaries on NanoProof fall into four classes:

1. **Malicious creators** — register Sources they don't own, or claim ownership of others' work.
2. **Malicious agents** — submit Citation requests designed to drain creator payouts or claim Sources improperly.
3. **Colluding pairs** — creator + agent together sybil-attack the protocol.
4. **External attackers** — exploit protocol mechanics (rate limits, embedding cache, etc.) without registering.

The defenses below target all four.

---

## Attack catalog

| ID | Attack | Severity | Class |
|----|--------|----------|-------|
| **A1** | Citation farming — submit responses that cite every registered Source to drain period caps | High | Malicious agent |
| **A2** | Content duplication — register the same Source under multiple accounts to multiply payouts | High | Malicious creator |
| **A3** | Spam content — register thousands of low-quality Sources to dilute attribution | Medium | Malicious creator |
| **A4** | Fake ownership — claim a Source that belongs to someone else | High | Malicious creator |
| **A5** | AI-generated citation abuse — submit LLM-generated text that quotes Sources without using them | High | Malicious agent |
| **A6** | Sybil attack — create many agent accounts to bypass rate limits | Medium | Collusion |
| **A7** | Repeated source manipulation — repeatedly cite the same Source with paraphrased text to inflate counts | Medium | Malicious agent |
| **A8** | Embedding poisoning — register Sources with crafted content designed to attract false-positive matches | High | Malicious creator |
| **A9** | Royalty-split laundering — register with co-authors who are actually the attacker | Medium | Malicious creator |
| **A10** | Source squatting — register a Source you don't intend to maintain, hoping someone else "discovers" it | Low | Malicious creator |
| **A11** | Hot-wallet drain — compromise an agent's hot wallet to extract accumulated escrow | Critical | External attacker |
| **A12** | Verification bypass — bypass DNS/HTML/file verification to register a Source you don't own | High | Malicious creator |
| **A13** | Embedding-cache poisoning — feed crafted responses to get a "trusted" embedding cached | High | Malicious agent |
| **A14** | Replay attack — re-submit an old Citation request to double-pay | Medium | External attacker |
| **A15** | Withdrawal-of-attribution — Creator removes a Source after citations accumulate to deny payouts | High | Malicious creator |
| **A16** | Score manipulation — exploit a flaw in the attribution model to inflate own Citations | Critical | Collusion |

---

## Risk levels

| Level | Definition | Response time |
|-------|------------|---------------|
| **Critical** | Funds at risk or protocol integrity compromised | <1 hour, page on-call |
| **High** | Significant financial loss possible; affects many users | <4 hours |
| **Medium** | Loss possible but bounded; affects few users | <24 hours |
| **Low** | Annoyance / brand risk only | <7 days |

---

## Layered defenses

### L1 — Input rate limiting

- Per-agent: 600 requests/min default; configurable per ApiKey.
- Per-IP: 100 requests/min unauthenticated; 2,000/min authenticated.
- Per-Citation: max 20 Citations per response.
- Per-response: max 50 candidates.
- Burst budget: 100 requests in 10 seconds (token bucket).

### L2 — Period caps (Creator-controlled)

Every Source has a configurable `periodCap` (atomic USDC) per agent per 24h window. When a Creator's Source would pay out more than `periodCap` in the period, additional Citations:

- Are still recorded (full audit trail).
- Have `payoutStatus = CAPPED` and accumulate as creator credit.
- Are paid out at the start of the next period.

### L3 — Confidence threshold (τ)

A Citation is only emitted if `matchScore ≥ τ` (default 0.78). High-precision signals (`urlExact`, `doiExact`, `embeddingSim ≥ 0.92`) must contribute ≥ 0.3 to the combined score. This prevents low-signal embeddings from fabricating citations (A5, A13).

### L4 — Novelty check (A1, A7)

Every Citation request is checked against the agent's recent history:

```
recent_similarity = max cosine(spanEmb, spanEmb_recent) over last 100 spans
if recent_similarity > 0.95:
   penalty = (recent_similarity - 0.95) * 10
   citation.payoutMultiplier = max(0.1, 1 - penalty)
```

A paraphrase that's nearly identical to a previous citation by the same agent pays out at reduced rate.

### L5 — Diversity bonus (already in attribution model)

The `w_diversity` factor naturally dampens A7: repeated citations to the same Source get `1 / log(1 + n)` weight.

### L6 — Source quality scoring (A3, A8)

A Source's `w_qual` weight is gated on:

- `reputationScore` of the Creator (≥ 10 to publish).
- `verified` status (must be `ACTIVE`, not `DRAFT` / `PENDING` / `REJECTED`).
- `contentLength` floor (text Sources must be ≥ 200 words; media Sources must have non-trivial perceptual hash distance from existing Sources).

New Sources have `w_qual = 0.5`; high-rep Sources approach 1.0.

### L7 — Embedding cache poisoning defense (A13)

The embedding cache is **never** populated by user input alone. The engine only embeds:

1. Source content at registration time.
2. The **user query** and the **response text** provided by the authenticated agent.

The cache key is the SHA-256 of the canonicalized input. Adversaries who feed crafted responses only poison their own cache slot.

### L8 — Reputation-gated rate limits (A6, A11)

New agents have:
- `maxPerResponse: $0.05` USDC
- `maxPerDay: $1.00` USDC
- `matchScore floor: 0.85` (higher than the default 0.78)

As an agent's `reputationScore` grows (based on real, varied, high-confidence citations), these limits relax. New agents cannot drain creators.

### L9 — Idempotency keys (A14)

`POST /v1/citations/analyze` and `POST /v1/citations/record` honor `Idempotency-Key` headers. The response is cached for 24h in Redis. Replays return the cached response without re-executing the pipeline.

### L10 — Escrow + holding period (A15, A16)

When a Citation is created, the corresponding payout goes into an `escrow` state for **7 days**. After the holding period:

- If no dispute was filed, the escrow releases to the Creator.
- If a dispute was filed, the funds remain held until resolution.

Creators who remove a Source do not lose pending escrow for past Citations.

### L11 — Dispute queue

Creators can flag any Citation via `POST /v1/citations/:id/dispute`. Disputed Citations:

- Are immediately marked `payoutStatus = DISPUTED`.
- Trigger a manual review by Canteen ops.
- Payouts held until resolved.

Disputes are public (Source, Creator, Citation ID, dispute reason) — no naming-and-shaming, but enough to deter frivolous disputes.

### L12 — Append-only ledger + hash chaining

Every Citation row carries a `prevHash` pointer to the prior Citation row. This forms a tamper-evident chain:

```
hash_n = sha256(prevHash_n || canonical(citation_n))
```

If an adversary modifies any historical Citation, the chain breaks at that point. The Indexer verifies the chain continuously.

### L13 — Withdrawal cooldowns (A11)

Agent hot-wallet withdrawals (future: a feature for self-custodial agents who want to extract earnings) have:

- 24h cooldown between withdrawals.
- Daily cap of $100 USDC.
- 2FA required for amounts > $25 USDC.

(Not used in Phase 3 but documented for Phase 5 reference.)

---

## Per-attack mitigations

| Attack | Primary defense | Secondary defense |
|--------|-----------------|-------------------|
| **A1** Citation farming | L2 period caps | L4 novelty check + L8 reputation-gated limits |
| **A2** Content duplication | Fingerprint duplicate detection (Phase 2) | L2 period caps + manual review |
| **A3** Spam content | L6 quality scoring | L1 rate limits + minimum-content checks |
| **A4** Fake ownership | Source verification (Phase 2 DNS/HTML/file) | L11 dispute queue + L12 ledger |
| **A5** AI-generated abuse | L3 confidence threshold | L4 novelty check + L7 cache defense |
| **A6** Sybil | L8 reputation-gated limits | L1 IP rate limits + KYC for high-volume agents |
| **A7** Repeated manipulation | L4 novelty + L5 diversity | L2 period caps |
| **A8** Embedding poisoning | L7 cache defense | L6 quality scoring + L3 threshold |
| **A9** Royalty laundering | L11 dispute queue | Co-author verification (Phase 6+) |
| **A10** Source squatting | L6 minimum-content checks | Periodic re-verification of stale Sources |
| **A11** Hot-wallet drain | L13 withdrawal cooldowns | KMS-backed key management (Phase 9) |
| **A12** Verification bypass | Source Verification (Phase 2) + manual escalation | L11 dispute queue |
| **A13** Embedding-cache poisoning | L7 cache defense | L3 threshold + L6 quality |
| **A14** Replay attack | L9 idempotency keys | L12 hash chain |
| **A15** Withdrawal of attribution | L10 escrow holding period | L12 append-only ledger |
| **A16** Score manipulation | Public attribution model + versioning | L12 hash chain + manual review |

---

## Detection signals

The engine exposes a real-time fraud-scoring signal per Citation request:

```typescript
type FraudSignals = {
  ipRisk: number;                    // 0..1, based on IP reputation
  agentReputation: number;           // 0..1, normalized from agent.score
  noveltyScore: number;              // 0..1, high = fresh; low = repeated
  candidateDiversity: number;        // 0..1, high = many distinct sources; low = same as always
  fingerprintAge: number;            // days since Source was last verified
  authorshipConflict: number;        // 0..1, high = multiple creators claim
  // ... see matching/fraud.ts
};

fraudRiskScore = weightedSum(signals);
```

If `fraudRiskScore > 0.7`, the Citation is auto-quarantined (held in escrow without payout) and flagged for review.

If `0.5 < fraudRiskScore ≤ 0.7`, the Citation pays out normally but the agent's reputation takes a hit.

If `fraudRiskScore ≤ 0.5`, the Citation is processed normally.

---

## Quarantine + dispute flow

```
1. Citation created with fraudRiskScore > 0.7
   → state: payoutStatus = QUARANTINED
   → stored in audit log
   → alert raised to ops channel

2. Ops reviews within 24h
   a. Legitimate (false positive) → release escrow, normal payout
   b. Suspicious → contact agent, gather evidence
   c. Confirmed abuse → clawback escrow, revoke agent, log incident

3. Creator can also dispute within 7 days
   → same flow with Creator as the disputing party
```

All outcomes are published to a public incident ledger (Source ID, outcome, no PII).

---

## Operational metrics

See [`analytics.md`](./analytics.md) for the full set. Fraud-specific:

- `fraud.detection.events` (counter) — every flagged event
- `fraud.quarantine.rate` (gauge) — fraction of Citations quarantined
- `fraud.false_positive.rate` (gauge) — quarantined → released
- `fraud.false_negative.rate` (gauge) — disputes raised on non-quarantined Citations
- `fraud.clawback.amount_usdc` (counter) — total USDC clawed back
- `fraud.by_attack.<id>.count` (counter) — count per attack type

---

## See also

- [`citation-engine.md`](./citation-engine.md) — pipeline context
- [`attribution-model.md`](./attribution-model.md) — model that the defenses protect
- [`analytics.md`](./analytics.md) — fraud metrics
- [`../SECURITY.md`](../SECURITY.md) — disclosure process
- [`runbooks/incident-response.md`](../docs/runbooks/incident-response.md)