---
id: P4-009
title: "[Phase 4] Implement FeeCalculator + TierEvaluator + RebateEngine"
labels:
  - phase:phase-4
  - area:payment-engine
  - area:fees
  - priority:high
  - type:feature
priority: high
depends_on: []
milestone: Phase 4 — Payment Engine
estimate: M
---

# [Phase 4] Implement FeeCalculator + TierEvaluator + RebateEngine

## Summary

`packages/payment-engine/fees/`. Per [`docs/fee-structure.md`](../../../docs/fee-structure.md).

## Acceptance criteria

- [ ] FeeCalculator computes protocol fee + gas amortization.
- [ ] TierEvaluator: 4 tiers (FREE/GROWTH/SCALE/ENTERPRISE) per rolling 30d volume.
- [ ] VolumeTracker: incremental updates on each Receipt.
- [ ] RebateEngine: monthly cron computes + executes rebates.
- [ ] GasAmortizer: even split of batch gas cost.
- [ ] Unit tests + integration test against seeded Receipts.

## Dependencies

None.