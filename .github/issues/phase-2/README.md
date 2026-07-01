# Phase 2 Implementation Issues

> Twenty-two issues for Phase 2 (Creator Registry). Each file is a self-contained implementation ticket that can be filed to GitHub Issues or handed to a contributor.

## Index

| ID | Title | Priority | Depends on | Estimate |
|----|-------|----------|------------|----------|
| [P2-001](./0001-prisma-schema-initial.md) | Define initial Prisma schema for Creator Registry | 🔴 High | — | M |
| [P2-002](./0002-prisma-service-bootstrap.md) | Bootstrap NestJS PrismaService + PrismaModule | 🔴 High | P2-001 | S |
| [P2-003](./0003-clerk-auth-strategy.md) | Implement Clerk JWT authentication strategy + guard | 🔴 High | P2-002 | M |
| [P2-004](./0004-apikey-auth-strategy.md) | Implement ApiKey authentication strategy + guard | 🔴 High | P2-002 | M |
| [P2-005](./0005-shared-schemas-creator.md) | Add Creator Zod schemas to @nanoproof/shared | 🔴 High | — | S |
| [P2-006](./0006-creator-module-controller.md) | Implement Creator module — controller + service + repository | 🔴 High | P2-002, P2-003, P2-005 | L |
| [P2-007](./0007-shared-schemas-wallet.md) | Add Wallet + Address Zod schemas to @nanoproof/shared | 🔴 High | — | S |
| [P2-008](./0008-wallet-module-controller.md) | Implement Wallet module — controller + service + repository | 🔴 High | P2-002, P2-007 | M |
| [P2-009](./0009-wallet-signature-verification.md) | Implement EIP-191 wallet signature verification | 🔴 High | P2-008 | M |
| [P2-010](./0010-shared-schemas-source.md) | Add Source Zod schemas to @nanoproof/shared | 🔴 High | — | S |
| [P2-011](./0011-source-module-controller.md) | Implement Source module — controller + service + repository | 🔴 High | P2-002, P2-010 | M |
| [P2-012](./0012-source-verification-probers.md) | Implement Source verification probers (DNS / HTML / File) | 🔴 High | P2-011 | L |
| [P2-013](./0013-organization-module.md) | Implement Organization module + memberships | 🟡 Med | P2-002, P2-006 | M |
| [P2-014](./0014-apikey-module.md) | Implement ApiKey module — issue / list / revoke | 🔴 High | P2-002, P2-004 | M |
| [P2-015](./0015-zod-validation-pipe.md) | Implement global ZodValidationPipe + ValidationError formatter | 🔴 High | — | S |
| [P2-016](./0016-bullmq-infrastructure.md) | Set up BullMQ + Redis for verification retries | 🟡 Med | P2-002 | M |
| [P2-017](./0017-idempotency-interceptor.md) | Implement Idempotency-Key interceptor + caching layer | 🟡 Med | P2-016 | S |
| [P2-018](./0018-swagger-openapi-bootstrap.md) | Mount Swagger UI + serve OpenAPI spec at /docs | 🟡 Med | P2-006 | S |
| [P2-019](./0019-reputation-score-worker.md) | Implement Creator reputation score worker | 🟢 Low | P2-006 | M |
| [P2-020](./0020-gdpr-soft-delete-purge.md) | Implement GDPR erasure job (purge soft-deleted Creators) | 🟢 Low | P2-006, P2-016 | S |
| [P2-021](./0021-phase-2-acceptance-tests.md) | Phase 2 acceptance — full end-to-end happy path test | 🔴 High | P2-006 → P2-014 | M |
| [P2-022](./0022-shared-error-catalog-extension.md) | Extend shared NP_* error catalog with Phase 2 codes | 🔴 High | — | S |

## Suggested execution order

1. P2-022 (error catalog) + P2-015 (validation pipe) + P2-001 (schema) — the foundation trio.
2. P2-002 (Prisma bootstrap), P2-005 (Creator schemas), P2-003 (Clerk auth).
3. P2-006 (Creator module) — unblocks Org + ApiKey + downstream.
4. P2-007, P2-010, P2-008, P2-011 (Wallet + Source schemas + CRUD).
5. P2-009 (signature verify), P2-012 (source probers) — the verification meat.
6. P2-016, P2-017 (queue + idempotency) — required by P2-012's retry behavior.
7. P2-013, P2-014, P2-004 (Org, ApiKey module, ApiKey auth).
8. P2-018, P2-019, P2-020 (observability + polish).
9. P2-021 (acceptance tests) — must be last.

## Labels used

| Label | Meaning |
|-------|---------|
| `phase:phase-2` | Issue belongs to Phase 2 |
| `area:api` / `area:web` / `area:shared` / `area:docs` | Affected surface |
| `area:auth` / `area:creators` / `area:wallets` / `area:sources` / `area:organizations` / `area:apikeys` | Affected module |
| `area:security` / `area:compliance` | Cross-cutting concern |
| `area:prisma` / `area:infrastructure` | Infra area |
| `priority:high` / `priority:medium` / `priority:low` | Effort priority |
| `type:feature` / `type:auth` / `type:database` / `type:validation` / `type:infrastructure` / `type:docs` / `type:testing` / `type:security` / `type:compliance` | Issue type |