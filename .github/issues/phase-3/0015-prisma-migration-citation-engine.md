---
id: P3-015
title: "[Phase 3] Apply Prisma migration for Citation Engine schema additions"
labels:
  - phase:phase-3
  - area:api
  - area:prisma
  - priority:high
  - type:database
priority: high
depends_on: []
milestone: Phase 3 — Citation Engine
estimate: M
---

# [Phase 3] Apply Prisma migration for Citation Engine schema additions

## Summary

Merge `apps/api/prisma/schema.citation-engine.prisma` into the main `schema.prisma` and generate the migration. Includes Postgres triggers for append-only enforcement.

## Acceptance criteria

- [ ] All 7 new models merged: `Fingerprint`, `Attribution`, `Citation`, `Evidence`, `Contribution`, `CreatorMatch`, `FraudSignal`, `Dispute`, `AnalyticsRollup`.
- [ ] All 4 new enums merged.
- [ ] HNSW index on `fingerprints.embedding`.
- [ ] Custom SQL migration creates `enforce_append_only()` function + triggers on `citations`, `attributions`, `contributions`, `evidences`.
- [ ] `pnpm db:migrate -- --name citation_engine_v1` applies cleanly to a fresh DB.
- [ ] Rollback migration documented.

## Dependencies

None (parallel to P3-001 — schema is the contract).