---
id: P4-010
title: "[Phase 4] Implement TreasuryManager + FeeAccruer + HotWallet"
labels:
  - phase:phase-4
  - area:payment-engine
  - area:treasury
  - priority:high
  - type:feature
priority: high
depends_on: [P4-009, P4-006]
milestone: Phase 4 — Payment Engine
estimate: M
---

# [Phase 4] Implement TreasuryManager + FeeAccruer + HotWallet

## Summary

`packages/payment-engine/treasury/`. Per [`docs/treasury-management.md`](../../../docs/treasury-management.md).

## Acceptance criteria

- [ ] TreasuryManager: state, balance, transactions, withdrawals.
- [ ] FeeAccruer: every settled Receipt writes a FEE_ACCRUAL row.
- [ ] HotWallet: balance + drain protection + daily cap.
- [ ] RefillScheduler: auto-refill when below threshold.
- [ ] Unit + integration tests.

## Dependencies

- P4-009 (fee calculator)
- P4-006 (Arc client)