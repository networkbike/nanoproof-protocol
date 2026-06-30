---
id: P4-011
title: "[Phase 4] Implement ReceiptWriter + HashChain + Verifier"
labels:
  - phase:phase-4
  - area:payment-engine
  - area:receipts
  - priority:high
  - type:security
priority: high
depends_on: [P4-007]
milestone: Phase 4 — Payment Engine
estimate: M
---

# [Phase 4] Implement ReceiptWriter + HashChain + Verifier

## Summary

`packages/payment-engine/receipts/`. Per [`docs/arcscan-verification.md`](../../../docs/arcscan-verification.md).

## Acceptance criteria

- [ ] ReceiptWriter: persists Receipt with `prevHash` + `hash`.
- [ ] HashChain: `hash_n = sha256(prevHash || canonical(receipt_n))`.
- [ ] Verifier: 6-check independent verification (localExists, onchainExists, txHashMatches, blockTimestampMatches, transferEventsMatch, hashChainValid).
- [ ] Append-only enforcement (Postgres triggers + service guards).
- [ ] Unit tests + integration test against Arc testnet.

## Dependencies

- P4-007 (Gateway client)