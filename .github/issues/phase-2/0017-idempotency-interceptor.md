---
id: P2-017
title: "[Phase 2] Implement Idempotency-Key interceptor + caching layer"
labels:
  - phase:phase-2
  - area:api
  - priority:medium
  - type:infrastructure
priority: medium
depends_on:
  - P2-016
estimate: S
---

# [Phase 2] Implement Idempotency-Key interceptor + caching layer

## Summary

Honor the `Idempotency-Key` header on POST endpoints. Re-submitting the same key within 24h returns the cached response.

## Files to create

- `apps/api/src/common/interceptors/idempotency.interceptor.ts`

## Acceptance criteria

- [ ] Reads `Idempotency-Key` from headers.
- [ ] If present + previously seen within 24h, returns cached response with `Idempotent-Replay: true` header.
- [ ] If new, runs the handler, caches the response (status + body), returns it.
- [ ] Storage backed by Redis (`idempotency:<key>` keys, 24h TTL).
- [ ] Only applied to POST endpoints via `@Idempotent()` decorator.
- [ ] Unit tests + integration test.

## Dependencies

- P2-016 (BullMQ/Redis)