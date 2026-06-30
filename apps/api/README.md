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

## Module map

```
apps/api/src/
├── auth/                  # Clerk JWT verification, session guards
├── creators/              # Creator profile CRUD, payout settings
├── sources/               # Source registration, fingerprinting, licensing
├── citations/             # Citation event ingest + read APIs
├── payments/              # Payment intent lifecycle, batch orchestration
├── agents/                # Agent developer accounts, API key issuance
├── analytics/             # Aggregations, dashboards queries
├── webhooks/              # Inbound from Circle, Arc, Clerk
├── common/                # Filters, interceptors, pipes, error codes
├── infra/                 # Prisma service, queue clients, config
└── main.ts                # Bootstrap
```

---

## Public API surface

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/creators` | POST | Register a creator |
| `/v1/creators/:id` | GET | Get creator profile |
| `/v1/creators/:id/payout-settings` | PATCH | Update splits + caps |
| `/v1/sources` | POST | Register a source |
| `/v1/sources/:id` | GET / PATCH / DELETE | Manage source |
| `/v1/citations` | POST | Ingest citation event (agent-side) |
| `/v1/payments/intents` | POST | Create a payment intent |
| `/v1/payments/intents/:id/execute` | POST | Execute a payment intent |
| `/v1/agents/keys` | POST | Issue API key |
| `/v1/analytics/creator/:id` | GET | Creator analytics |
| `/v1/webhooks/circle` | POST | Circle webhook receiver |
| `/v1/webhooks/arc` | POST | Arc finality webhook receiver |
| `/v1/healthz` | GET | Health check |

The full OpenAPI spec is auto-generated at `/openapi.json` and rendered at `/docs`.

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
| `CIRCLE_API_KEY` | Circle API |
| `CIRCLE_GATEWAY_URL` | Circle Gateway endpoint |
| `ARC_RPC_URL` | Arc L1 RPC |
| `AGENT_WALLET_PRIVATE_KEY` | Hot wallet signing payouts |
| `REDIS_URL` | BullMQ queue |
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
pnpm --filter @nanoproof/api db:migrate    # apply migrations
pnpm --filter @nanoproof/api db:seed      # load fixtures
pnpm --filter @nanoproof/api db:studio    # open Prisma Studio
```

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