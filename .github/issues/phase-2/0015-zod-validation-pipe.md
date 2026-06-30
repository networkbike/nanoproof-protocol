---
id: P2-015
title: "[Phase 2] Implement global ZodValidationPipe + ValidationError formatter"
labels:
  - phase:phase-2
  - area:api
  - area:shared
  - priority:high
  - type:infrastructure
priority: high
depends_on: []
estimate: S
status: closed
milestone: phase-2-creator-registry
---

# [Phase 2] Implement global ZodValidationPipe + ValidationError formatter

## Summary

A NestJS pipe that validates incoming request bodies, query params, and URL params against a Zod schema, and emits the standard `NP_VALIDATION_FAILED` error.

## Files to create

- `apps/api/src/common/pipes/zod-validation.pipe.ts`
- `apps/api/src/common/errors/validation.error.ts`

## Acceptance criteria

- [ ] Pipe accepts `{ schema: ZodSchema, target: 'body' | 'query' | 'params' }`.
- [ ] On failure, throws `BadRequestException` with body matching `ValidationErrorResponse` schema.
- [ ] Each Zod issue → `{ path, message, code }`.
- [ ] Applies via `@Body(schema)`, `@Query(schema)`, `@Param(schema)` parameter decorators.
- [ ] Unit tests cover happy path + every error shape.

## Dependencies

None.


## Resolution

**Status:** ✅ Closed.
**Milestone:** phase-2-creator-registry

apps/api/src/common/pipes/zod-validation.pipe.ts — ZodValidationPipe throwing NP_VALIDATION_FAILED with issues.

