---
id: P3-017
title: "[Phase 3] Implement REST controllers for /v1/citations, /v1/attributions, /v1/fingerprints"
labels:
  - phase:phase-3
  - area:api
  - area:citation-engine
  - priority:high
  - type:feature
priority: high
depends_on: [P3-015, P3-016]
milestone: Phase 3 — Citation Engine
estimate: L
---

# [Phase 3] Implement REST controllers for Citation Engine

## Summary

NestJS controllers for all Citation Engine endpoints per [`apps/api/openapi/citation-engine.yaml`](../../../apps/api/openapi/citation-engine.yaml).

## Acceptance criteria

- [ ] `CitationsController` (analyze, record, list, get, dispute, list-by-source, list-by-creator).
- [ ] `AttributionsController` (calculate, get).
- [ ] `FingerprintsController` (generate, get, by-url, by-content, by-source).
- [ ] All Zod-validated via the global pipe.
- [ ] Idempotency honored on POST.
- [ ] Cursor pagination on list endpoints.
- [ ] Unit + integration tests for every endpoint and error path.

## Dependencies

- P3-015 (schema migration)
- P3-016 (Zod schemas)