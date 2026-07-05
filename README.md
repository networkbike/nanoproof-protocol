# NanoProof Protocol

> **Open infrastructure for autonomous creator compensation.**
> AI agents automatically pay creators USDC whenever their work is cited.
>
> **Phase 8 LIVE** — x402 payment protocol + Arc settlement proof + ArcScan verification.

[![Version](https://img.shields.io/badge/version-1.0.0--rc.1-blue)](./CHANGELOG.md) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE) [![Node](https://img.shields.io/badge/node-%E2%89%A522-339933)](https://nodejs.org/) [![pnpm](https://img.shields.io/badge/pnpm-9-F69220)](https://pnpm.io/)

NanoProof sits between AI agents and human creators. When an agent cites a Source, NanoProof detects the citation, attributes it to the right Creator, and settles a USDC nanopayment on **Arc** via **x402** (Coinbase's open HTTP 402 standard). Every settlement produces an **immutable, hash-chained SettlementProof** that's verified on **ArcScan** (Blockscout v2).

**Live demo** (no auth, no install): **[nanoproof-web-production.up.railway.app](https://nanoproof-web-production.up.railway.app)**

**60-second judge walkthrough**: [docs/JUDGE_GUIDE.md](./docs/JUDGE_GUIDE.md)

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

## Status: **v1.0.0-rc.1 — Release Candidate** 🎯

All 8 development phases shipped. Project is in **Release Candidate mode** —
only functional testing, demo testing, bug fixes, performance improvements, and
submission materials from here on.

**Production audit**: 78 / 100 (live) → 88 / 100 (post-deploy). See [`docs/PHASE8_AUDIT.md`](./docs/PHASE8_AUDIT.md).

**Lepton submission**: [`docs/SUBMISSION.md`](./docs/SUBMISSION.md).

**60-second judge demo**: [`docs/JUDGE_GUIDE.md`](./docs/JUDGE_GUIDE.md).

**Live URLs (public, no auth)**:
- Web: https://nanoproof-web-production.up.railway.app
- API: https://nanoproof-api-production.up.railway.app
- Health: https://nanoproof-api-production.up.railway.app/v1/healthz
- Swagger: https://nanoproof-api-production.up.railway.app/api

---

## Current phase: **Phase 8 — x402 Payment Protocol** (SHIPPED)

This commit adds the **x402 payment protocol layer** (Phase 8) on top of the existing
Phase 0–7 stack. NanoProof now exposes HTTP 402 payment-protected endpoints backed
by Arc settlement proofs and ArcScan verification.

### What's new in Phase 8

- **`x402 middleware`** that returns proper HTTP 402 + `PAYMENT-REQUIRED` header (Coinbase open standard)
- **`PaymentRequest` lifecycle**: create → authorize (signed PAYMENT-SIGNATURE) → settle → verify
- **`SettlementProof`** — immutable, hash-chained per creator (`prevHash` + canonical body → `hash`)
- **`ArcScan verification`** via Blockscout v2 API (`https://testnet.arcscan.app/api/v2`)
- **11 REST endpoints** (all public, no auth required):
  - `POST /x402/demo` — one-click create+authorize+settle+verify
  - `POST /payments/create|authorize|settle|verify`
  - `GET /payments/history|:id|/proof/:id`
  - `GET /creators/:id/revenue`
  - `GET /metrics`, `GET /supporters`
- **Web UI**: `/payments` (one-click flow), `/history` (settlement table), `/history/[id]` (proof + verification timeline)
- **Dashboard Phase 8 strip**: 402 challenges served / x402 settled / ArcScan verified / unique supporters
- **Demo seed**: `GET /debug/seed-x402?count=30` creates 4 creators + 30 verified settlements
- **12 e2e tests** covering the full lifecycle (all passing)

### Stack

- **Backend**: NestJS 11 + Prisma 5 + Postgres 16 + pg driver adapter
- **Frontend**: Next.js 15 (React 19) + Tailwind 4
- **Chain**: Arc Testnet (chain id 5042002, USDC-native gas)
- **Protocols**: x402 (Coinbase open standard), EIP-3009, EIP-712
- **Verification**: ArcScan (Blockscout v2) at `https://testnet.arcscan.app/api/v2`

### Live URLs

- **Web home**: https://nanoproof-web-production.up.railway.app
- **x402 payment flow**: https://nanoproof-web-production.up.railway.app/payments
- **Settlement history**: https://nanoproof-web-production.up.railway.app/history
- **API health**: https://nanoproof-api-production.up.railway.app/v1/healthz
- **API Swagger**: https://nanoproof-api-production.up.railway.app/docs
- **API metrics**: https://nanoproof-api-production.up.railway.app/metrics

### Docs

- [`docs/PHASE8.md`](./docs/PHASE8.md) — Phase 8 overview, schema, decisions
- [`docs/X402_IMPLEMENTATION.md`](./docs/X402_IMPLEMENTATION.md) — x402 protocol deep dive
- [`docs/PAYMENT_FLOW.md`](./docs/PAYMENT_FLOW.md) — full request lifecycle
- [`docs/ARC_SETTLEMENT.md`](./docs/ARC_SETTLEMENT.md) — settlement proof + ArcScan verification
- [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md) — complete REST API reference
- [`docs/TERMUX_SETUP.md`](./docs/TERMUX_SETUP.md) — **running locally on Android Termux** (pglite, no Docker)

Earlier phases: Phase 0 (MVP) → Phase 2 (Creator Registry) → Phase 3 (Citation Engine) →
Phase 4 (Payment Engine) → Phase 5 (Lepton Demo) → Phase 6 (Analytics Dashboard) →
Phase 7 (Deployment configs) → **Phase 8 (x402 + Arc Settlement Proof)**.

## Quickstart (5 minutes)

> **No Docker?** See [`docs/TERMUX_SETUP.md`](./docs/TERMUX_SETUP.md) for the pglite-based Termux path.

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

Built for the Lepton Hackathon (Canteen × Circle × Arc).<!-- trigger: Fri Jul  3 12:55:52 UTC 2026 -->
