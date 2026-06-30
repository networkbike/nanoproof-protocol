---
id: P4-007
title: "[Phase 4] Implement Circle Gateway client + batch executor"
labels:
  - phase:phase-4
  - area:payment-engine
  - area:settlement
  - priority:high
  - type:feature
priority: high
depends_on: [P4-006]
milestone: Phase 4 — Payment Engine
estimate: M
---

# [Phase 4] Implement Circle Gateway client + batch executor

## Summary

`packages/payment-engine/settlement/gateway-client.ts`. Submit batches to Circle Gateway; poll status; parse Arc txHash.

## Acceptance criteria

- [ ] `submitBatch`, `getBatchStatus`, `cancelBatch`.
- [ ] Max 1000 payouts per batch.
- [ ] Status flow: PENDING → SUBMITTED → SETTLED.
- [ ] Retry: 3× with exponential backoff on 5xx.
- [ ] Fallback: on second timeout, settle via direct viem (P4-006).
- [ ] Unit tests + integration test against Circle testnet.

## Dependencies

- P4-006 (Arc client)