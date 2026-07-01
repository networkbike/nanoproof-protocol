---
id: P4-012
title: "[Phase 4] Apply Prisma migration for Payment Engine schema"
labels:
  - phase:phase-4
  - area:api
  - area:prisma
  - priority:high
  - type:database
priority: high
depends_on: []
milestone: Phase 4 — Payment Engine
estimate: M
---

# [Phase 4] Apply Prisma migration for Payment Engine schema

## Summary

Merge `apps/api/prisma/schema.payment-engine.prisma` into the main schema + generate migration.

## Acceptance criteria

- [ ] All new models merged: Vault, PaymentIntent, Payout, PaymentQuote, Receipt, ReceiptPayout, TreasuryTransaction, TreasuryWithdrawal, RebatePaymentIntent, FeeSchedule, ReconciliationReport.
- [ ] All new enums merged.
- [ ] Postgres triggers for append-only on `payment_intents`, `payouts`, `receipts`.
- [ ] `pnpm db:migrate -- --name payment_engine_v1` applies cleanly.
- [ ] Rollback migration documented.

## Dependencies

None (parallel to P4-001).