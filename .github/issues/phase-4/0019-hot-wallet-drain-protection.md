---
id: P4-019
title: "[Phase 4] Implement HotWallet drain protection + daily cap enforcement"
labels:
  - phase:phase-4
  - area:payment-engine
  - area:treasury
  - priority:high
  - type:security
priority: high
depends_on: [P4-010]
milestone: Phase 4 — Payment Engine
estimate: S
---

# [Phase 4] Implement HotWallet drain protection

## Summary

`packages/payment-engine/treasury/hot-wallet.ts`. Per-payout + per-day cap on agent hot wallet.

## Acceptance criteria

- [ ] Per-payout cap enforced; over-cap PaymentIntent refused.
- [ ] Daily cap enforced; over-cap pauses batching + alerts ops.
- [ ] Configurable per-agent overrides.
- [ ] Unit + integration tests.

## Dependencies

- P4-010 (HotWallet)