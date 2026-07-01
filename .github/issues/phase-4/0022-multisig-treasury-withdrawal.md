---
id: P4-022
title: "[Phase 4] Implement multisig TreasuryWithdrawal flow"
labels:
  - phase:phase-4
  - area:payment-engine
  - area:treasury
  - priority:high
  - type:security
priority: high
depends_on: [P4-010]
milestone: Phase 4 — Payment Engine
estimate: M
---

# [Phase 4] Implement multisig TreasuryWithdrawal flow

## Summary

`packages/payment-engine/treasury/withdrawal-manager.ts`. Safe transaction submission + threshold-based signature collection.

## Acceptance criteria

- [ ] `initiateWithdrawal`, `signWithdrawal`, `executeWithdrawal`.
- [ ] Threshold 3-of-5 default; configurable per Org.
- [ ] 7-day expiry on pending withdrawals.
- [ ] 5-of-5 required for amounts ≥ $10k.
- [ ] Public visibility of pending withdrawals.
- [ ] Unit + integration tests.

## Dependencies

- P4-010