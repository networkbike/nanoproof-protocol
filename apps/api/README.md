# NanoProof API (`apps/api`)

> NestJS REST + WebSocket API — the orchestration plane of NanoProof Protocol.

[![Stack: NestJS 11](https://img.shields.io/badge/NestJS-11-E0234E.svg)](https://nestjs.com)
[![Stack: PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://postgresql.org)
[![Stack: Prisma 6](https://img.shields.io/badge/Prisma-6-2D3748.svg)](https://prisma.io)
[![Auth: Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF.svg)](https://clerk.com)

---

## Overview

The API is the authoritative orchestration plane. It owns the database, coordinates the Citation Engine and Payment Engine workers, issues API keys to agent developers, ingests webhooks from Circle and Arc, and exposes the public REST + WebSocket surface to the SDK and dashboards.

---

## Module map (Phase 2)

```
apps/api/src/
├── auth/                  # Clerk + ApiKey strategies, guards
├── creators/              # Creator profile CRUD
├── organizations/         # Org CRUD + memberships
├── wallets/               # Wallet CRUD + EIP-191 verification
├── sources/               # Source CRUD + DNS/HTML/file verification
├── apikeys/               # API-key issuance + revocation
├── common/                # Filters, pipes, interceptors, errors
├── infra/                 # Prisma, queue, config, http
└── main.ts                # Bootstrap
```

Phase 3+ adds `citations/`, `payments/`, `agents/`, `analytics/`, `webhooks/`.

---

## Public API surface (Phase 2)

### Creator

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/v1/creators` | POST | Clerk | Create or idempotently return the auth'd creator |
| `/v1/creators` | GET | Clerk | List creators (cursor-paginated) |
| `/v1/creators/:id` | GET | Public | Public creator profile + counters |
| `/v1/creators/:id` | PATCH | Clerk (owner) | Update profile |
| `/v1/creators/:id` | DELETE | Clerk (owner) | Soft-delete |

### Wallet

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/v1/wallets` | POST | Clerk | Attach a wallet |
| `/v1/wallets` | GET | Clerk | List wallets for current creator |
| `/v1/wallets/:id` | PATCH | Clerk (owner) | Update label / isPrimary |
| `/v1/wallets/:id/challenge` | POST | Clerk (owner) | Issue EIP-191 challenge |
| `/v1/wallets/:id/verify` | POST | Clerk (owner) | Submit signature, mark VERIFIED |

### Source

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/v1/sources` | POST | Clerk | Register a source (DRAFT) |
| `/v1/sources` | GET | Public | List sources (filterable) |
| `/v1/sources/:id` | GET | Public | Read source |
| `/v1/sources/:id` | PATCH | Clerk (owner) | Update source |
| `/v1/sources/:id` | DELETE | Clerk (owner) | Archive |
| `/v1/sources/:id/challenge` | POST | Clerk (owner) | Issue verification challenge |
| `/v1/sources/:id/verify` | POST | Clerk (owner) | Probe + verify |

### Organization

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/v1/organizations` | POST | Clerk | Create |
| `/v1/organizations` | GET | Public | List |
| `/v1/organizations/:id` | GET | Public | Read |
| `/v1/organizations/:id/members` | POST | Clerk (owner/admin) | Invite |
| `/v1/organizations/:id/members/:memberId` | PATCH | Clerk (owner/admin) | Update role |
| `/v1/organizations/:id/members/:memberId` | DELETE | Clerk (owner/admin) | Remove |

### ApiKey

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/v1/apikeys` | POST | Clerk | Issue a key (plaintext returned once) |
| `/v1/apikeys` | GET | Clerk | List keys (never return plaintext or hash) |
| `/v1/apikeys/:id` | DELETE | Clerk (owner) | Revoke |

### System

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/healthz` | GET | Health check |
| `/docs` | GET | Swagger UI |
| `/openapi.yaml` | GET | Canonical OpenAPI 3.1 spec |

The Phase 2 canonical OpenAPI spec lives at [`openapi/creator-registry.yaml`](./openapi/creator-registry.yaml) and is served at `/openapi.yaml`. The Phase 3 spec lives at [`openapi/citation-engine.yaml`](./openapi/citation-engine.yaml).

### Citation Engine (Phase 3)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/v1/citations/analyze` | POST | ApiKey | Analyze an AI response (dry run) |
| `/v1/citations/record` | POST | ApiKey | Persist an Attribution (atomic write) |
| `/v1/citations` | GET | ApiKey | List Citations (filterable) |
| `/v1/citations/:id` | GET | ApiKey | Read a Citation (with Evidence + CreatorMatch) |
| `/v1/citations/:id/dispute` | POST | Clerk (owner) | File a Creator-raised dispute |
| `/v1/citations/source/:sourceId` | GET | Public | List Citations of a Source |
| `/v1/citations/creator/:creatorId` | GET | Clerk (owner) | List Citations received by a Creator |
| `/v1/attributions/calculate` | POST | ApiKey | Recompute an Attribution under a new policy version |
| `/v1/attributions/:id` | GET | Public | Read an Attribution |
| `/v1/fingerprints/generate` | POST | Clerk | Generate a Source fingerprint |
| `/v1/fingerprints/:id` | GET | Public | Read a Fingerprint |
| `/v1/fingerprints/by-url` | GET | Public | Lookup by URL |
| `/v1/fingerprints/by-content/:hash` | GET | Public | Lookup by content hash |
| `/v1/fingerprints/source/:sourceId` | GET | Public | List Fingerprint versions for a Source |
| `/v1/analytics/protocol` | GET | Public | Public protocol metrics |
| `/v1/analytics/top-sources` | GET | Public | Top Sources by citation volume |
| `/v1/analytics/top-domains` | GET | Public | Top Domains by citation volume |
| `/v1/analytics/top-creators` | GET | Public | Most-referenced Creators |
| `/v1/analytics/creator/:id` | GET | Clerk (owner) | Creator-private metrics |
| `/v1/analytics/source/:id` | GET | Public | Source metrics |
| `/v1/analytics/agent/:id` | GET | ApiKey | Agent metrics |
| `/v1/analytics/fraud` | GET | Clerk (operator) | Fraud-detection metrics |
| `/v1/analytics/export.csv` | GET | Clerk (operator) | Stream CSV export |

---

## Environment

Copy `.env.example` to `.env`:

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL (Neon in prod) |
| `CLERK_SECRET_KEY` | Clerk secret |
| `CLERK_JWT_KEY` | Clerk JWT verification key |
| `CLERK_WEBHOOK_SECRET` | Clerk lifecycle webhooks |
| `CIRCLE_API_KEY` | Circle API (Phase 5+) |
| `CIRCLE_GATEWAY_URL` | Circle Gateway endpoint (Phase 5+) |
| `ARC_RPC_URL` | Arc L1 RPC |
| `AGENT_WALLET_PRIVATE_KEY` | Hot wallet signing payouts (Phase 5+) |
| `REDIS_URL` | BullMQ queue (verification retries, webhooks) |
| `VERIFICATION_CHALLENGE_TTL_MIN` | Challenge TTL (default 15) |
| `DNS_PROBE_TIMEOUT_MS` | DNS probe budget (default 5000) |
| `HTML_PROBE_TIMEOUT_MS` | HTML fetch budget (default 5000) |
| `WALLET_MESSAGE_PREFIX` | EIP-191 message prefix (default `NanoProof Wallet Verification`) |
| `API_KEY_PREFIX` | Plaintext prefix (default `np_live_`) |
| `SENTRY_DSN` | Error tracking |
| `AXIOM_TOKEN` | Log aggregation |
| `PORT` | Server port (default 4000) |

---

## Local development

```bash
pnpm --filter @nanoproof/api dev
# → http://localhost:4000
```

Database:

```bash
pnpm --filter @nanoproof/api db:generate  # regenerate Prisma client
pnpm --filter @nanoproof/api db:migrate   # apply migrations (dev)
pnpm --filter @nanoproof/api db:migrate:deploy   # apply migrations (CI/prod)
pnpm --filter @nanoproof/api db:seed      # load fixtures
pnpm --filter @nanoproof/api db:studio    # open Prisma Studio
```

The Prisma schema lives at [`prisma/schema.prisma`](./prisma/schema.prisma). See [`../../docs/phase-2-creator-registry.md`](../../docs/phase-2-creator-registry.md) for the canonical architecture.

Tests:

```bash
pnpm --filter @nanoproof/api test         # unit + integration
pnpm --filter @nanoproof/api test:e2e     # supertest end-to-end
```

---

## Conventions

- **Modules per bounded context.** Each feature is a module with its own controller, service, and DTOs.
- **Zod schemas from `@nanoproof/shared`** for every request and response.
- **Prisma** for all reads/writes. Raw SQL only for analytics aggregations.
- **BullMQ workers** for payment orchestration and webhook processing.
- **OpenAPI** auto-published on every build.
- **Errors** use the `NP_*` catalog from `@nanoproof/shared`.

---

## Deployment

- **Staging + Production:** Railway.
- **Preview per PR:** Railway preview environment.
- **Migrations** run automatically on release via `pnpm db:migrate:deploy`.
- **Logs** ship to Axiom.

---

## Roadmap

See [`ROADMAP.md`](../../ROADMAP.md) for the build phases this app lands in (Phase 2, 5, 6, 7, 9).

---

## License

MIT — see [`LICENSE`](../../LICENSE).