# Changelog

All notable changes to NanoProof Protocol are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Phase 5 — Lepton Demo MVP** (← the bulk of this commit)
  - `@nanoproof/agent` package: `core/`, `research/`, `citations/`, `attribution/`, `settlement/`, `prompts/`, `types/`, `tests/`
  - End-to-end orchestrator: `research(question, { apiBaseUrl, mode })` runs the full pipeline (Question → Research → Citation Match → Attribution → Payment → Settlement)
  - Lightweight citation matcher: keyword overlap (tokenize, stopword filter, TF + cosine sim)
  - Attribution model: 60/25/15 split, atomic USDC strings
  - Settlement bridge: agent → `POST /v1/payments/settle` with responseId
  - 5-source Lepton demo dataset: BTC restaking (SatLayer + Babylon), Arc L1, Creator Economy
  - Web demo at `apps/web/src/app/research/page.tsx` — 7 panels (Hero, Query, AI Response, Sources Used, Attribution, Payment Allocation, Settlement, Payment Proof)
  - Server-side `/api/agent` route that imports `@nanoproof/agent` and runs the pipeline
  - `pnpm --filter @nanoproof/agent seed` registers all 5 creators + sources + wallets
  - `docs/demo-script.md` — 5-min judge demo with narration + Q&A + recording checklist
  - `docs/deployment.md` — Vercel + Railway + Neon with $0/mo free tier plan
  - GitHub milestone `lepton-demo-mvp` + 12 issues under `.github/issues/lepton-demo/`
  - 16/16 agent unit tests pass; 14/14 api unit tests pass; tsc clean across all 3 workspaces

## [0.3.0] — Phase 3 Thin Slice

### Added
- **Phase 3 — Citation Engine thin slice** (← the bulk of this commit)
  - `Fingerprint` model + migration (`fingerprints` table with `(sourceId, algorithm, hash)` unique)
  - `Citation.matchKind` column (`URL` / `DOMAIN` / future `FINGERPRINT` / `QUOTE`)
  - `CitationsDetector` service implementing the simplified detection pipeline (URL extraction → normalization → Source matching → scoring → recording)
  - `POST /v1/citations/detect` accepts agent response text, returns Citation rows tied to real Creators + total USDC + unresolved URL list + `X-Citation-Receipt` header
  - `POST /v1/payments/settle` accepts a `responseId`, settles one `Payment` row per PENDING Citation (replaces MVP `simulate` semantics)
  - Backwards-compat shims: `/v1/citations/simulate` + `/v1/payments/simulate` still work for the old dashboard
  - Web simulator page rewritten to call `/detect` then `/settle` — the full detect→pay pipeline
  - URL extractor unit suite (11 tests) covering dedup, punctuation, snippet window, normalization

## [0.2.0] — Phase 2 Implementation

### Added
- **Phase 2 — Creator Registry implementation** (← the bulk of this commit)
  - Expanded Prisma schema (Organization, OrganizationMembership, ApiKey, VerificationChallenge, SourceVerification, IdempotencyKey) + partial unique index on primary wallets
  - Migration: `apps/api/prisma/migrations/20260701000001_phase2_creator_registry/migration.sql`
  - Append-only Postgres triggers on `citations` + `payments` (NP_READONLY)
  - `NPError` (Nest HttpException) + global filter mapping 18 NP_* codes to statuses
  - `ZodValidationPipe` — Zod schemas as DTOs at controller boundary
  - `IdempotencyInterceptor` — 24h Idempotency-Key replay via Postgres table
  - Global `ApiKeyGuard` (`@Public()`, `@RequireScopes()`) with bcrypt-hashed bearer tokens
  - `CreatorsService` + controller — full CRUD, uniqueness, reserved-name block, cursor pagination, stats aggregate
  - `WalletsService` + controller — attach, EIP-191 challenge (10-min TTL), `viem.recoverMessageAddress` verify, atomic flip to VERIFIED+isPrimary
  - `SourcesService` + controller — register, list, archive
  - `SourcesVerifier` — DNS_TXT (dns.resolveTxt), HTML_META (fetch + regex), FILE_UPLOAD (fetch /.well-known/), MANUAL
  - `ApiKeysService` + controller — mint (plaintext shown once), list, revoke
  - Swagger UI at `/docs` with full decorators
  - Vitest unit + e2e infrastructure (e2e suite requires a live Postgres)
  - 16 of 22 Phase-2 issues closed via frontmatter (P2-001/002/004/005/007-012/014/015/017/018/021/022)

### Changed
- Downgraded Prisma from 6 to 5.22 (effect/bundler issue with pnpm-hoisted effect package)

## [0.1.0] — MVP Scaffolding (Phase 0)

### Added
- `apps/api` (NestJS 11 + Prisma 5) wired with: PrismaService, HealthController, Creators/Wallets/Sources/Citations/Payments modules with skeleton CRUD + simulate endpoints, HttpExceptionFilter mapping to NP_* codes, helmet + cors + rate-limiter + Swagger
- `apps/web` (Next.js 15 + Tailwind 4 + shadcn-style components) with landing, dashboard, simulate, api-keys pages
- `packages/shared` with Zod schemas for Creator / Wallet / Source / Citation / Payment, NP_* error catalog, atomic-USDC constants + utils
- Consolidated Prisma schema v1 (Creator, Wallet, Source, Citation, Payment + 4 enums) + idempotent seed
- `docker-compose.yml` (Postgres 16 + Redis 7)
- `SETUP.md`, `DEVELOPMENT.md`, README rewrite for MVP scope
- 5 GitHub milestones under `.github/milestones/`

## [0.0.0] — Repository Foundation (Phase 1)

### Added
- Initial monorepo scaffold (apps + packages + contracts + docs + scripts + .github)
- Top-level documentation: README, ARCHITECTURE, ROADMAP, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT
- Per-package READMEs for `sdk`, `citation-engine`, `payment-engine`, `shared`, `web`, `api`, `contracts`, `scripts`
- `docs/` structure: README, architecture notes, protocol spec (draft), Lepton submission checklist
- 5 Architecture Decision Records under `docs/adr/`
- 6 operational runbooks under `docs/runbooks/`
- 4 integration guides (Vercel AI SDK, LangChain, LlamaIndex, custom) under `docs/integrations/`
- GitHub workflows: `ci.yml`, `release.yml`, `audit.yml`
- GitHub issue templates: bug, feature, question, security
- GitHub PR template + CODEOWNERS + Dependabot config
- Workspace tooling: pnpm workspaces, Turborepo, ESLint 9 flat config, Prettier, TypeScript strict base config
- Changesets config for SemVer + release automation

### Phase 2 — Creator Registry architecture
- Prisma schema: `apps/api/prisma/schema.prisma` (Creator, Wallet, Source, Organization, OrganizationMembership, ApiKey, VerificationChallenge)
- Canonical OpenAPI 3.1 spec: `apps/api/openapi/creator-registry.yaml`
- Architecture: `docs/phase-2-creator-registry.md`
- Sub-docs: `docs/creator-registry.md`, `docs/source-verification.md`, `docs/wallet-verification.md`
- 22 implementation tickets under `.github/issues/phase-2/`
- Updated `apps/api/README.md` with the Phase 2 endpoint map

### Phase 3 — Citation Engine architecture
- Canonical architecture: `docs/citation-engine.md` (10-stage pipeline, components, latency budget, auditability)
- Source fingerprinting: `docs/source-fingerprinting.md` (composite hash, version tracking, perceptual hashes, SSRF defense)
- Attribution model: `docs/attribution-model.md` (5 citation types, 6 weight factors, sum-to-one guarantee, worked example)
- Fraud prevention: `docs/fraud-prevention.md` (16-attack catalog, 13-layer defense, quarantine + dispute flow)
- Analytics: `docs/analytics.md` (protocol/creator/source/agent/fraud metrics, dashboards, exports)
- Future extensions: `docs/future-extensions.md` (Arc, USDC, Circle Agent Stack, x402, marketplaces, licensing)
- Append-only Prisma additions: `apps/api/prisma/schema.citation-engine.prisma` (Fingerprint, Attribution, Citation, Evidence, Contribution, CreatorMatch, FraudSignal, Dispute, AnalyticsRollup + Postgres triggers)
- OpenAPI 3.1 spec: `apps/api/openapi/citation-engine.yaml` (citations, attributions, fingerprints, analytics, dispute, fraud)
- Package subdirectory READMEs: `packages/citation-engine/{core,scoring,fingerprinting,matching,registry,analytics,types,interfaces,docs,tests}/README.md`
- 25 implementation tickets under `.github/issues/phase-3/`

### Phase 4 — Payment Engine architecture
- Canonical architecture: `docs/payment-engine.md` (8-stage pipeline, settlement model, latency budget)
- Settlement: `docs/settlement-arc.md` (Arc L1, Circle Gateway batching, x402 envelopes)
- Creator vaults: `docs/creator-vaults.md` (3 modes, multisig, migration)
- Revenue allocation: `docs/revenue-allocation.md` (splits, org policy, recursive royalties, zero-loss)
- ArcScan verification: `docs/arcscan-verification.md` (hash-chained Receipts, 6-check verification)
- Payment audit: `docs/payment-audit.md` (audit trail, replay toolkit, dispute resolution)
- Treasury management: `docs/treasury-management.md` (3-of-5 multisig, hot wallet, cold storage, KMS migration)
- Fee structure: `docs/fee-structure.md` (0.5% default + 4 tiers, batching tiers, volume rebates)
- Payout workflows: `docs/payout-workflows.md` (12 end-to-end flows + failure modes + retry semantics)
- Append-only Prisma additions: `apps/api/prisma/schema.payment-engine.prisma` (Vault, PaymentIntent, Payout, PaymentQuote, Receipt, ReceiptPayout, TreasuryTransaction, TreasuryWithdrawal, RebatePaymentIntent, FeeSchedule, ReconciliationReport + Postgres triggers)
- OpenAPI 3.1 spec: `apps/api/openapi/payment-engine.yaml` (vaults, payments, payouts, receipts, treasury, fees, rebates, reconciliation)
- Package subdirectory READMEs: `packages/payment-engine/{core,settlement,vaults,allocation,receipts,treasury,fees,x402,types,interfaces,docs,tests}/README.md`
- 25 implementation tickets under `.github/issues/phase-4/`
- ROADMAP phases reordered: Phase 4 = Payment Engine, Phase 5 = AI Research Agent

### Notes
- **Pre-alpha.** No application code is shipped yet — see `ROADMAP.md` for the phased build plan.
- Implementation begins in Phase 2 of the roadmap.