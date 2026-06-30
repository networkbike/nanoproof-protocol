---
id: P3-013
title: "[Phase 3] Implement Fraud Detection — 8 signals + composite risk score"
labels:
  - phase:phase-3
  - area:citation-engine
  - area:fraud
  - priority:high
  - type:security
priority: high
depends_on: [P3-004]
milestone: Phase 3 — Citation Engine
estimate: L
---

# [Phase 3] Implement Fraud Detection — 8 signals

## Summary

`packages/citation-engine/matching/fraud.ts` + `signals/*.ts`. Implements the 8 fraud signals from [`docs/fraud-prevention.md`](../../../docs/fraud-prevention.md).

## Acceptance criteria

- [ ] Each of the 8 signals implemented in `signals/`: ip, agent-reputation, novelty, candidate-diversity, fingerprint-age, authorship-conflict, burst-rate, period-cap-near.
- [ ] Composite `fraudRiskScore = weightedSum(signals)`.
- [ ] Auto-quarantine threshold: `> 0.7` → `payoutStatus = QUARANTINED`.
- [ ] Soft-quarantine threshold: `0.5 < x ≤ 0.7` → pays out but agent reputation takes hit.
- [ ] Every signal's `detail` JSON stored in `FraudSignal` row.
- [ ] Unit tests + integration tests with crafted abuse scenarios.

## Dependencies

- P3-004 (matcher)