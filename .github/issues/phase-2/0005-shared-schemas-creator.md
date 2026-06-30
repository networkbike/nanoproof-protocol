---
id: P2-005
title: "[Phase 2] Add Creator Zod schemas to @nanoproof/shared"
labels:
  - phase:phase-2
  - area:shared
  - priority:high
  - type:validation
priority: high
depends_on: []
estimate: S
status: closed
milestone: phase-2-creator-registry
---

# [Phase 2] Add Creator Zod schemas to @nanoproof/shared

## Summary

Define the canonical Zod schemas for the Creator resource. Every API and SDK will infer its types from these.

## Files to create

- `packages/shared/src/schemas/creator.ts`
- `packages/shared/src/schemas/username.ts` (reserved word + regex validation helper)
- `packages/shared/src/schemas/index.ts` (re-export)

## Acceptance criteria

- [ ] `CreateCreatorSchema`, `UpdateCreatorSchema`, `CreatorSchema`, `CreatorPublicSchema` exported.
- [ ] Username regex enforces `^[a-z0-9][a-z0-9_-]*[a-z0-9]$`, length 3-30.
- [ ] Reserved username list includes at minimum: `admin`, `api`, `dashboard`, `signup`, `signin`, `nanoproof`, `support`, `about`, `docs`, `pricing`, `status`.
- [ ] Email validated via Zod's `.email()`.
- [ ] Avatar URL restricted to HTTPS + allowlist of hosts.
- [ ] Inferred `type Creator`, `type CreateCreator`, etc. exported.
- [ ] Unit tests cover happy path + every validation rule.

## Notes

- The schema's `id` is the prefixed CUID (`cr_...`) — store the prefix validation separately as a brand.
- Consider a `CreatorBrand = z.string().regex(/^cr_/)` for type-safe IDs.

## Dependencies

None — but should land before any API work that consumes Creator schemas.


## Resolution

**Status:** ✅ Closed.
**Milestone:** phase-2-creator-registry

packages/shared/src/schemas/creator.ts exports CreateCreatorSchema + UpdateCreatorSchema + UsernameSchema (reserved-name blocklist).

