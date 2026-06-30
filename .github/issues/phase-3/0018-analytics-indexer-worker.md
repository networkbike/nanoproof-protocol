---
id: P3-018
title: "[Phase 3] Implement Analytics Indexer worker (materialized views + rollups)"
labels:
  - phase:phase-3
  - area:api
  - area:analytics
  - priority:medium
  - type:feature
priority: medium
depends_on: [P3-012]
milestone: Phase 3 — Citation Engine
estimate: M
---

# [Phase 3] Implement Analytics Indexer worker

## Summary

`packages/citation-engine/analytics/indexer.ts`. Consumes `citation.recorded` + `payment.settled` events; maintains `AnalyticsRollup` rows.

## Acceptance criteria

- [ ] BullMQ consumer subscribing to events emitted by Recorder.
- [ ] Hourly + daily + weekly + monthly rollups.
- [ ] Writes atomic USDC totals, citation counts, fraud event counts per scope.
- [ ] Idempotent — re-processing the same event does not double-count.
- [ ] Public dashboard endpoints read from rollup tables.
- [ ] Unit tests + integration tests with seeded events.

## Dependencies

- P3-012 (recorder)