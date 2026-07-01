---
id: P4-024
title: "[Phase 4] Phase 4 acceptance — full end-to-end payout test on Arc testnet"
labels:
  - phase:phase-4
  - area:api
  - area:payment-engine
  - priority:high
  - type:testing
priority: high
depends_on: [P4-001, P4-003, P4-007, P4-010, P4-011]
milestone: Phase 4 — Payment Engine
estimate: M
---

# [Phase 4] Phase 4 acceptance — full end-to-end payout test on Arc testnet

## Summary

e2e test exercising the full pipeline against Arc testnet + Circle Gateway testnet.

## Acceptance criteria

The test:

1. Registers a Creator + Vault + 2 Sources.
2. Submits 5 Citations.
3. Verifies Aggregator produces a PaymentIntent.
4. Allocator applies splits correctly (zero-loss).
5. Quoter signs PaymentQuote.
6. x402 envelope signed + verified.
7. Gateway batch submitted.
8. Arc finality confirmed in <500ms.
9. Receipt persisted with hash chain link.
10. ArcScan URL is publicly accessible.
11. TreasuryTransaction(FEE_ACCRUAL) persisted.
12. Reconciler run → no drift.
13. Clawback flow exercised.
14. Refund scenario for dispute resolution.
15. Rebate computation for volume-tier upgrade.

## Dependencies

- P4-001, P4-003, P4-007, P4-010, P4-011 closed.