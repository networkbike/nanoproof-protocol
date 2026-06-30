---
id: P2-011
title: "[Phase 2] Implement Source module — controller + service + repository"
labels:
  - phase:phase-2
  - area:api
  - area:sources
  - priority:high
  - type:feature
priority: high
depends_on:
  - P2-002
  - P2-010
estimate: M
status: closed
milestone: phase-2-creator-registry
---

# [Phase 2] Implement Source module — controller + service + repository"

## Summary

Implement Source CRUD endpoints. Verification endpoints are split into P2-012.

## Files to create

- `apps/api/src/sources/sources.module.ts`
- `apps/api/src/sources/sources.controller.ts`
- `apps/api/src/sources/sources.service.ts`
- `apps/api/src/sources/sources.repository.ts`
- `apps/api/src/sources/dto/create-source.dto.ts`
- `apps/api/src/sources/dto/update-source.dto.ts`
- `apps/api/src/sources/dto/query-sources.dto.ts`

## Acceptance criteria

- [ ] `POST /v1/sources` creates a Source in `DRAFT`.
- [ ] `(creatorId, url)` uniqueness enforced.
- [ ] `domain` auto-derived from `url` (eTLD+1 via `psl`).
- [ ] `GET /v1/sources` is publicly readable, supports `creatorId`, `organizationId`, `domain`, `status` filters; defaults to `status = ACTIVE` for unauthenticated callers.
- [ ] `PATCH /v1/sources/:id` only owner can update; only `ACTIVE ↔ PAUSED` status transitions via PATCH.
- [ ] `DELETE /v1/sources/:id` soft-deletes (sets `status = ARCHIVED`, `archivedAt = now()`).
- [ ] Emits `source.created`, `source.updated`, `source.archived` events.
- [ ] Unit + integration tests for every endpoint.

## Notes

- `citationPrice` stored as atomic units; the API normalizes to/from human-readable strings for the dashboard.

## Dependencies

- P2-002 (Prisma)
- P2-010 (Source schemas)


## Resolution

**Status:** ✅ Closed.
**Milestone:** phase-2-creator-registry

apps/api/src/modules/sources/{controller,service}.ts — register / list / get / start-verif / run-verif / archive.

