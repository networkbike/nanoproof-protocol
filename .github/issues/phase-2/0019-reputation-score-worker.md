---
id: P2-019
title: "[Phase 2] Implement Creator reputation score worker (initial formula)"
labels:
  - phase:phase-2
  - area:api
  - area:creators
  - priority:low
  - type:feature
priority: low
depends_on:
  - P2-006
estimate: M
status: in-progress
milestone: phase-2-creator-registry
---

# [Phase 2] Implement Creator reputation score worker (initial formula)

## Summary

Initial implementation of the `Creator.reputationScore` updater. Formulas live in `docs/adr/0009-reputation-score.md` (drafted in Phase 2 close-out).

## Files to create

- `apps/api/src/creators/reputation/reputation.worker.ts`
- `apps/api/src/creators/reputation/score.ts`

## Acceptance criteria

- [ ] Daily BullMQ cron recomputes `reputationScore` for every active Creator.
- [ ] Initial formula: `score = verified_sources * 10 + verified_wallets * 5 + earned_atomic_usdc / 1_000_000`.
- [ ] Output written via bulk update (`UPDATE creators SET reputation_score = ...`).
- [ ] ADR-0009 drafted + linked in the worker docblock.

## Notes

- Phase 2 ships a placeholder formula. Phase 5 (Payment Engine) introduces citation-quality inputs.

## Dependencies

- P2-006 (Creators)
- P2-016 (BullMQ)
