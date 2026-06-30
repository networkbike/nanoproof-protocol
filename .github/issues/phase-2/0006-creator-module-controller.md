---
id: P2-006
title: "[Phase 2] Implement Creator module — controller + service + repository"
labels:
  - phase:phase-2
  - area:api
  - area:creators
  - priority:high
  - type:feature
priority: high
depends_on:
  - P2-002
  - P2-003
  - P2-005
estimate: L
---

# [Phase 2] Implement Creator module — controller + service + repository

## Summary

Implement the full Creator bounded context: controller with all 5 endpoints (`POST`, `GET list`, `GET :id`, `PATCH :id`, `DELETE :id`), service with business logic, repository with Prisma queries.

## Files to create

- `apps/api/src/creators/creators.module.ts`
- `apps/api/src/creators/creators.controller.ts`
- `apps/api/src/creators/creators.service.ts`
- `apps/api/src/creators/creators.repository.ts`
- `apps/api/src/creators/dto/create-creator.dto.ts`
- `apps/api/src/creators/dto/update-creator.dto.ts`
- `apps/api/src/creators/dto/query-creators.dto.ts`
- `apps/api/src/creators/events/creator-created.event.ts`
- `apps/api/src/creators/events/creator-updated.event.ts`
- `apps/api/src/creators/events/creator-deleted.event.ts`

## Acceptance criteria

- [ ] All 5 endpoints functional and documented per OpenAPI spec.
- [ ] `POST /v1/creators` is idempotent on Clerk userId (returns existing Creator if one exists).
- [ ] Validation pipe rejects malformed payloads via Zod schemas from `@nanoproof/shared`.
- [ ] `DELETE` soft-deletes (sets `isActive = false`, `deletedAt = now()`).
- [ ] Pagination cursor encoded as opaque base64 string.
- [ ] Emits `creator.created`, `creator.updated`, `creator.deleted` via NestJS EventEmitter.
- [ ] ETag + Last-Modified headers on `GET` responses.
- [ ] `GET /v1/creators/:id` returns enriched `CreatorPublic` with computed counts.
- [ ] Unit tests + integration tests cover every endpoint and every error path.

## Notes

- Use the `ZodValidationPipe` from `common/` to wire schemas.
- Use the `IdempotencyInterceptor` to honor `Idempotency-Key` headers.
- Reputation score is computed (not user-settable); for now it's just `0`.

## Dependencies

- P2-002 (Prisma)
- P2-003 (Clerk auth)
- P2-005 (Shared Creator schemas)