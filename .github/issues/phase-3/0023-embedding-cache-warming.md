---
id: P3-023
title: "[Phase 3] Implement embedding cache warming + LRU eviction policy"
labels:
  - phase:phase-3
  - area:citation-engine
  - priority:medium
  - type:performance
priority: medium
depends_on: [P3-005]
milestone: Phase 3 — Citation Engine
estimate: S
---

# [Phase 3] Implement embedding cache warming + LRU

## Summary

Redis-backed embedding cache with 24h TTL and LRU eviction. Pre-warm on Source registration.

## Acceptance criteria

- [ ] `EmbeddingCache` interface (`get`, `set`, `del`, `keys`).
- [ ] Cache key = `sha256(canonicalize(input))`.
- [ ] TTL: 24h; LRU size: 100k entries.
- [ ] Pre-warming: on Source registration, compute and cache its embedding immediately.
- [ ] Bypass flag (`CE_CACHE_DISABLED=true`) for debugging.
- [ ] Unit tests + integration test against Redis.

## Dependencies

- P3-005 (embedders)