---
id: P3-012
title: "[Phase 3] Implement CitationRecorder — atomic write + append-only hash chain"
labels:
  - phase:phase-3
  - area:citation-engine
  - area:database
  - priority:high
  - type:feature
priority: high
depends_on: [P3-011]
milestone: Phase 3 — Citation Engine
estimate: M
---

# [Phase 3] Implement CitationRecorder

## Summary

`packages/citation-engine/core/recorder.ts`. Persists Attribution + Citations + Evidences + Contributions + CreatorMatches + Fingerprints in a single Postgres transaction with append-only hash chaining.

## Acceptance criteria

- [ ] Single transaction per Attribution.
- [ ] Every Citation row stamped with `rowHash = sha256(prevHash || canonical(this row))`.
- [ ] Every Attribution carries the hash of its last Citation.
- [ ] Append-only enforced via Postgres triggers (per `apps/api/prisma/schema.citation-engine.prisma`).
- [ ] Application-level guard: `UPDATE` on Citation tables is rejected at the service layer.
- [ ] Integration test: replay a known Attribution row chain and verify hash matches.

## Dependencies

- P3-011 (quoter)