---
id: P3-007
title: "[Phase 3] Implement Fingerprint version tracking + duplicate detection"
labels:
  - phase:phase-3
  - area:citation-engine
  - area:fingerprinting
  - priority:medium
  - type:feature
priority: medium
depends_on: [P3-006]
milestone: Phase 3 — Citation Engine
estimate: M
---

# [Phase 3] Implement Fingerprint version tracking + duplicate detection

## Summary

`packages/citation-engine/fingerprinting/{versions,duplicates}.ts`. Manages the `CURRENT | SUPERSEDED` lifecycle and detects duplicate Sources.

## Acceptance criteria

- [ ] `bump(sourceId)` promotes current to SUPERSEDED and creates a new CURRENT.
- [ ] `findDuplicate({url, contentHash, title, author})` returns the matching Fingerprint or null.
- [ ] Duplicate detection hierarchy: exact composite → content-hash → URL-only → fuzzy title+author.
- [ ] When a Creator registers a new Source, the system surfaces existing duplicates as suggestions.
- [ ] Append-only enforcement: never modify a Fingerprint row, only insert new ones.
- [ ] Unit tests for the lifecycle + duplicate hierarchy.

## Dependencies

- P3-006 (generator)