---
id: P3-019
title: "[Phase 3] Implement REST controllers for /v1/analytics/*"
labels:
  - phase:phase-3
  - area:api
  - area:analytics
  - priority:medium
  - type:feature
priority: medium
depends_on: [P3-018]
milestone: Phase 3 — Citation Engine
estimate: M
---

# [Phase 3] Implement REST controllers for /v1/analytics/*

## Summary

NestJS controllers for `/v1/analytics/{protocol,top-sources,top-domains,top-creators,creator/:id,source/:id,agent/:id,fraud,export.csv}`.

## Acceptance criteria

- [ ] All endpoints from the OpenAPI spec implemented.
- [ ] `export.csv` streams as `text/csv` (max 10M rows).
- [ ] Time-bucket queries (`hour`, `day`, `week`, `month`).
- [ ] Cache top-level results at edge (60s TTL).
- [ ] Operator-authenticated `fraud` endpoint.
- [ ] Unit + integration tests.

## Dependencies

- P3-018 (indexer)