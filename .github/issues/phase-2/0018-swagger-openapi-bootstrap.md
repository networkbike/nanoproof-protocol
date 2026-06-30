---
id: P2-018
title: "[Phase 2] Mount Swagger UI + serve OpenAPI spec at /docs"
labels:
  - phase:phase-2
  - area:api
  - area:docs
  - priority:medium
  - type:docs
priority: medium
depends_on:
  - P2-006
estimate: S
---

# [Phase 2] Mount Swagger UI + serve OpenAPI spec at /docs

## Summary

Wire `@nestjs/swagger` to render the spec generated from controller decorators, and serve the canonical YAML at `/openapi.yaml`.

## Files to create

- `apps/api/src/main.ts` updates
- `apps/api/openapi/creator-registry.yaml` (already drafted)

## Acceptance criteria

- [ ] `SwaggerModule.setup('docs', app, document)` renders at `/docs`.
- [ ] `/openapi.yaml` returns the canonical YAML (not the runtime-generated JSON).
- [ ] Both Clerk and ApiKey security schemes appear in the "Authorize" UI.
- [ ] Schemas from `@nanoproof/shared` are picked up via `@ApiExtraModels`.
- [ ] Unit test: `/openapi.yaml` is valid OpenAPI 3.1 (validated via `@apidevtools/swagger-parser`).

## Dependencies

- P2-006 (Creators — first controller with decorators)