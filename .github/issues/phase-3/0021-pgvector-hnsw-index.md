---
id: P3-021
title: "[Phase 3] Enable pgvector extension + create HNSW index on fingerprints.embedding"
labels:
  - phase:phase-3
  - area:api
  - area:prisma
  - priority:high
  - type:database
priority: high
depends_on: [P3-015]
milestone: Phase 3 — Citation Engine
estimate: S
---

# [Phase 3] Enable pgvector extension + HNSW index

## Summary

Migration that enables `vector` extension on Postgres + creates the HNSW index on `fingerprints.embedding`.

## Acceptance criteria

- [ ] Migration runs `CREATE EXTENSION IF NOT EXISTS vector;`.
- [ ] Migration creates HNSW index on `fingerprints.embedding vector_cosine_ops`.
- [ ] Index build time logged.
- [ ] EXPLAIN ANALYZE on a nearest-neighbor query confirms index is used.
- [ ] Neon autoscaling verified — extension available on the production cluster.

## Dependencies

- P3-015 (schema migration)