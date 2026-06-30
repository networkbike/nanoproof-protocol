---
id: P2-001
title: "[Phase 2] Define initial Prisma schema for Creator Registry"
labels:
  - phase:phase-2
  - area:api
  - area:prisma
  - priority:high
  - type:database
priority: high
depends_on: []
estimate: M
status: closed
milestone: phase-2-creator-registry
---

# [Phase 2] Define initial Prisma schema for Creator Registry

## Summary

Land the canonical Prisma schema that captures Creator, Wallet, Source, Organization, ApiKey, and VerificationChallenge — exactly as documented in [`docs/phase-2-creator-registry.md`](../../../docs/phase-2-creator-registry.md).

## Files to create

- `apps/api/prisma/schema.prisma`

## Acceptance criteria

- [ ] Schema matches the spec in `docs/phase-2-creator-registry.md` §3 byte-for-byte.
- [ ] All enums are defined in `schema.prisma` (`WalletNetwork`, `WalletVerificationStatus`, `SourceStatus`, `VerificationMethod`, `ApiKeyScope`, `OrganizationRole`).
- [ ] All relations use `onDelete: Cascade` or `onDelete: SetNull` per the spec.
- [ ] Composite and unique indexes are declared exactly as in the spec (e.g. `(creatorId, url)`).
- [ ] `pnpm --filter @nanoproof/api db:generate` runs cleanly.
- [ ] `pnpm --filter @nanoproof/api db:migrate -- --name init_creator_registry` produces a migration that applies to a fresh Postgres.

## Notes

- Money columns are `String` (atomic units), never `Float`/`Decimal`.
- Embeddings use `Unsupported("vector(1536)")` — pgvector extension is enabled in the migration via `CREATE EXTENSION IF NOT EXISTS vector;` (custom SQL migration).
- ID prefixes (`cr_`, `wl_`, `src_`, `org_`, `ak_`, `vc_`) are generated at the application layer, not by Prisma defaults.

## Dependencies

None — this is the root issue for Phase 2.

## Closes

- Implements the schema portion of ROADMAP.md Phase 2 acceptance criteria.


## Resolution

**Status:** ✅ Closed.
**Milestone:** phase-2-creator-registry

Expand Creator, Wallet, Source; add Organization, ApiKey, VerificationChallenge, SourceVerification, IdempotencyKey. Migration in apps/api/prisma/migrations/20260701000001_phase2_creator_registry/migration.sql.

