---
id: P4-003
title: "[Phase 4] Implement Allocator — splits + org policy + recursive royalties"
labels:
  - phase:phase-4
  - area:payment-engine
  - area:allocation
  - priority:high
  - type:feature
priority: high
depends_on: [P4-001]
milestone: Phase 4 — Payment Engine
estimate: L
---

# [Phase 4] Implement Allocator

## Summary

`packages/payment-engine/allocation/allocator.ts`. Per [`docs/revenue-allocation.md`](../../../docs/revenue-allocation.md): applies splits, org policy, recursive royalties; emits zero-loss Payout[].

## Acceptance criteria

- [ ] Direct-owner default.
- [ ] Co-author splits via basisPoints (Σ = 10000).
- [ ] Organization role-based policy (OWNER/ADMIN/MEMBER/VIEWER).
- [ ] Recursive royalty splits (max depth 3).
- [ ] Zero-loss guarantee: Σ payouts == input ± rounding ≤ 1 atomic unit per split.
- [ ] `splitsHash` frozen at allocation time.
- [ ] Property-based test for sum-to-input.
- [ ] Unit tests for every allocation branch.

## Dependencies

- P4-001 (orchestrator)