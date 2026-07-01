---
id: P3-011
title: "[Phase 3] Implement PaymentQuoter — USDC quote per Creator with period caps"
labels:
  - phase:phase-3
  - area:citation-engine
  - area:payment-engine
  - priority:high
  - type:feature
priority: high
depends_on: [P3-010]
milestone: Phase 3 — Citation Engine
estimate: M
---

# [Phase 3] Implement PaymentQuoter

## Summary

`packages/citation-engine/scoring/quoter.ts`. Multiplies attribution fractions by Source base prices to produce atomic-USDC amounts per Creator, respecting `periodCap`.

## Acceptance criteria

- [ ] `quote(fractions, sources, periodCaps)` returns `PaymentQuote[]` (one per Creator).
- [ ] Per-Source `periodCap` enforced; over-cap Citations marked `payoutStatus = CAPPED`.
- [ ] Atomic USDC units only (`bigint` internally, string in API).
- [ ] `minPayout` floor; sub-floor Citations accumulate as creator credit.
- [ ] Unit tests for every cap + split combination.

## Dependencies

- P3-010 (resolver)