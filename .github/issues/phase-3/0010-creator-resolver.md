---
id: P3-010
title: "[Phase 3] Implement CreatorResolver — Source → Creator/Wallet resolution"
labels:
  - phase:phase-3
  - area:citation-engine
  - area:registry
  - priority:high
  - type:feature
priority: high
depends_on: [P3-009]
milestone: Phase 3 — Citation Engine
estimate: L
---

# [Phase 3] Implement CreatorResolver

## Summary

`packages/citation-engine/registry/resolver.ts` + supporting files. Handles direct ownership, organization splits, royalty splits, ownership disputes.

## Acceptance criteria

- [ ] Direct ownership (Source → Creator 1:1).
- [ ] Organization ownership with role-based policy (OWNER/ADMIN/MEMBER/VIEWER).
- [ ] Royalty splits applied from `Source.pricing.splits[]`.
- [ ] Ambiguous claims route to `PendingOwnership` queue.
- [ ] Wallet selection: primary wallet preferred, fallback rules.
- [ ] Resolution path audit object stored on `CreatorMatch`.
- [ ] Warnings emitted: `OWNERSHIP_DISPUTED`, `SPLITS_MISSING`, `PRIMARY_WALLET_MISSING`, etc.
- [ ] Unit tests covering every resolution branch + edge cases.

## Dependencies

- P3-009 (attribution scorer)