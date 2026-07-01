---
id: P2-010
title: "[Phase 2] Add Source Zod schemas to @nanoproof/shared"
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

# [Phase 2] Add Source Zod schemas to @nanoproof/shared

## Summary

Define Zod schemas for Source resources.

## Files to create

- `packages/shared/src/schemas/source.ts`

## Acceptance criteria

- [ ] `SourceStatusSchema`, `VerificationMethodSchema` mirror Prisma enums.
- [ ] `CreateSourceSchema` requires `title`, `url` (HTTPS only), `citationPrice`.
- [ ] `url` validated as URI + protocol-https.
- [ ] `citationPrice`, `minPayout`, `periodCap` are `z.string().regex(/^[0-9]+$/)` (atomic units).
- [ ] `UpdateSourceSchema` only allows mutating non-status fields plus `status: ACTIVE | PAUSED`.
- [ ] `SourceSchema`, `SourceChallengeSchema`, `SourceChallengeResponseSchema` exported.
- [ ] Unit tests cover happy + rejected paths.

## Notes

- Re-use the EIP-55 / URL validators from `wallet.ts` schemas where possible.

## Dependencies

None.


## Resolution

**Status:** ✅ Closed.
**Milestone:** phase-2-creator-registry

packages/shared/src/schemas/source.ts: CreateSourceSchema, ListSourcesQuerySchema, StartSourceVerificationSchema, SourceStatusSchema, AtomicUsdcSchema.

