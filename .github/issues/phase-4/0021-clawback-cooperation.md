---
id: P4-021
title: "[Phase 4] Implement cooperative clawback flow"
labels:
  - phase:phase-4
  - area:payment-engine
  - priority:medium
  - type:feature
priority: medium
depends_on: [P4-008, P4-011]
milestone: Phase 4 — Payment Engine
estimate: M
---

# [Phase 4] Implement cooperative clawback flow

## Summary

`packages/payment-engine/settlement/clawback.ts`. Triggered by dispute resolution PAYOUT_REVERSE.

## Acceptance criteria

- [ ] If Creator's vault has approved protocol as USDC spender: `transferFrom(treasury, amount)`.
- [ ] Else: queue for cooperative clawback; notify Creator to sign.
- [ ] TreasuryTransaction(type=CLAWBACK) persisted.
- [ ] Source.earnedAtomic decremented.
- [ ] Unit + integration tests.

## Dependencies

- P4-008, P4-011