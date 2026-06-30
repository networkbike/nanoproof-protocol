# NanoProof Protocol

> Open infrastructure for autonomous creator compensation. AI agents automatically pay creators USDC whenever their work is cited.

[![Status](https://img.shields.io/badge/status-mvp-blue)](./ROADMAP.md) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE) [![Node](https://img.shields.io/badge/node-%E2%89%A520.18.2-339933)](https://nodejs.org/) [![pnpm](https://img.shields.io/badge/pnpm-9-F69220)](https://pnpm.io/)

NanoProof sits between AI agents and human creators. When an agent cites a Source, NanoProof detects the citation, attributes it to the right Creator, and settles a USDC nanopayment on **Arc** via Circle Gateway + x402.

## What's in this repo

| Path                    | What it is                                                       |
| ----------------------- | ---------------------------------------------------------------- |
| `apps/api`              | NestJS 11 + Prisma 6 backend (REST + OpenAPI)                    |
| `apps/web`              | Next.js 15 creator dashboard + simulator                         |
| `packages/shared`       | Zod schemas + NP_* error catalog + atomic-USDC utils             |
| `docs/`                 | Architecture specs for Phases 2-5 (Creator Registry → AI Agent)  |
| `docker-compose.yml`    | Postgres 16 + Redis 7 for local dev                              |
| `.github/issues/`       | 70+ GitHub issues, one per ticket, organized by phase            |
| `openapi/`              | OpenAPI 3.1 specs for the public API surface                     |

## Current phase

This commit adds the **MVP scaffolding**:

- Monorepo wired with pnpm workspaces + Turborepo
- Backend (NestJS 11) with Prisma 6 + Postgres 16 + Redis 7
- Frontend (Next.js 15 + Tailwind 4 + shadcn-style components)
- Consolidated Prisma schema v1 — Creator, Wallet, Source, Citation, Payment
- Shared Zod schemas + NP_* error catalog
- Five end-to-end flows: creator registration, source registration, citation simulation, payment simulation, dashboard

**No business logic yet.** Phase 2 (Creator Registry) lands first.

## Quickstart (5 minutes)

```bash
# 1. Install
pnpm install

# 2. Bring up Postgres + Redis
docker compose up -d

# 3. Copy envs
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Migrate + seed
pnpm --filter @nanoproof/api db:migrate
pnpm --filter @nanoproof/api db:seed

# 5. Run both apps
pnpm dev
# → api: http://localhost:4000  (Swagger UI at /docs)
# → web: http://localhost:3000
```

## Try the simulator

1. Open <http://localhost:3000>
2. Hit **Run simulation** (the seed has a creator + source ready)
3. Open **Dashboard** to see the recorded citation + settled payment

## Architecture (one-paragraph version)

An agent queries NanoProof via REST. We detect citations in the agent's response, attribute them to Creators via URL/domain matching + fingerprinting, then settle USDC nanopayments on **Arc** through Circle Gateway. Receipts are anchored on-chain and exposed via ArcScan. The protocol is non-custodial from finality, append-only, and hash-chained.

Full architecture lives in [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) (placeholder; see `ARCHITECTURE.md`).

## Roadmap

- **Phase 1 — Repository Foundation** ✅
- **Phase 2 — Creator Registry** 🟢 current
- **Phase 3 — Citation Engine**
- **Phase 4 — Payment Engine**
- **Phase 5 — AI Research Agent**

See [`ROADMAP.md`](./ROADMAP.md).

## Contributing

PRs welcome. Read [`CONTRIBUTING.md`](./CONTRIBUTING.md), start from the `phase-2/*` issues.

## License

MIT — see [`LICENSE`](./LICENSE).

---

Built for the Lepton Hackathon (Canteen × Circle × Arc).