# NanoProof Protocol — Roadmap

> **Last updated:** 2026-06-30
> **Status:** Pre-Alpha (Phase 1 in progress)
> **Cadence:** Reviewed weekly during the Lepton Hackathon; quarterly post-launch.

This roadmap is the public plan for building NanoProof Protocol from a hackathon prototype into a venture-grade open protocol. Each phase ships a working increment; every increment is independently demoable.

---

## How to read this roadmap

- **Phase** — ordered build increment, not a date.
- **Status legend:** ⬜ Planned · 🟡 In Progress · ✅ Complete · ⏸ Paused
- **Lepton tag** — phases that ship before the Lepton submission deadline (Jul 6, 2026 11:59 PM ET).
- **Owner** — primary maintainer responsible for shipping the phase.

---

## Phase 1 — Repository Foundation  🟡 In Progress  · Lepton-tagged

**Goal:** Establish the monorepo, documentation, contributor workflow, and CI baseline so the rest of the protocol lands in a professional, reviewable home.

### Deliverables
- [x] Monorepo structure (apps + packages + contracts + docs + scripts + .github)
- [x] README, ARCHITECTURE, ROADMAP, CONTRIBUTING, SECURITY
- [x] Per-package READMEs and `.env.example` files
- [x] pnpm workspace + Turborepo configuration
- [x] GitHub Actions CI (lint, type-check, test, build)
- [x] Issue + PR templates
- [x] Code of Conduct + MIT LICENSE
- [x] Changesets config

### Acceptance
- Repo passes `pnpm lint && pnpm build` cleanly.
- New contributors can clone, install, and onboard from `CONTRIBUTING.md` alone.
- All top-level docs are present, internally consistent, and free of TODOs.

---

## Phase 2 — Creator Registry ⬜ Planned  · Lepton-tagged

**Goal:** Let creators register sources and attach a USDC payout wallet. This is the foundation every other layer depends on.

### Architecture (complete)
See [`docs/phase-2-creator-registry.md`](./docs/phase-2-creator-registry.md) for the canonical architecture document.
- [`docs/creator-registry.md`](./docs/creator-registry.md) — Creator + Organization REST surface, validation, errors.
- [`docs/source-verification.md`](./docs/source-verification.md) — DNS / HTML meta / file-upload verification flow.
- [`docs/wallet-verification.md`](./docs/wallet-verification.md) — Arc + EIP-191 challenge flow.
- [`apps/api/prisma/schema.prisma`](./apps/api/prisma/schema.prisma) — canonical DB schema (Creator, Wallet, Source, Organization, ApiKey, OrganizationMembership, VerificationChallenge).
- [`apps/api/openapi/creator-registry.yaml`](./apps/api/openapi/creator-registry.yaml) — canonical OpenAPI 3.1 spec.

### Implementation issues
22 implementation tickets live at [`.github/issues/phase-2/`](./.github/issues/phase-2/). See [the index](./.github/issues/phase-2/README.md) for execution order.

### Deliverables
- [ ] Prisma schema + migration (`P2-001`, `P2-002`)
- [ ] Clerk + ApiKey auth strategies (`P2-003`, `P2-004`)
- [ ] Shared Zod schemas: Creator, Wallet, Source, errors (`P2-005`, `P2-007`, `P2-010`, `P2-022`)
- [ ] Creator module — full CRUD + events (`P2-006`)
- [ ] Wallet module — CRUD + EIP-191 challenge/verify (`P2-008`, `P2-009`)
- [ ] Source module — CRUD + DNS/HTML/file probers (`P2-011`, `P2-012`)
- [ ] Organization module — CRUD + memberships (`P2-013`)
- [ ] ApiKey module — issue / list / revoke (`P2-014`)
- [ ] Global ZodValidationPipe + NP_* error catalog (`P2-015`, `P2-022`)
- [ ] BullMQ + Redis infra + Idempotency interceptor (`P2-016`, `P2-017`)
- [ ] Swagger UI + OpenAPI served at `/docs` + `/openapi.yaml` (`P2-018`)
- [ ] Reputation score worker + GDPR purge (`P2-019`, `P2-020`)
- [ ] Full end-to-end acceptance test (`P2-021`)
- [ ] Wallet connect via RainbowKit (Arc testnet + mainnet-ready) — frontend, Phase 4
- [ ] Creator dashboard MVP at `/dashboard` — frontend, Phase 4
- [ ] Source registration UI at `/dashboard/sources/new` — frontend, Phase 4
- [ ] Payout settings UI (default per-citation price, royalty splits, period cap) — frontend, Phase 4

### Acceptance
- A creator can sign up via Clerk, create a Creator profile, attach + verify an Arc wallet via EIP-191, register a Source + verify it via HTML meta, configure a 70/30 split between two payout addresses, and issue an API key — all within a single e2e test (`P2-021`).
- The Phase 2 OpenAPI spec serves at `/openapi.yaml` and renders at `/docs`.
- All `NP_*` errors are surfaced from a single shared catalog.

---

## Phase 3 — Citation Engine ⬜ Planned  · Lepton-tagged

**Goal:** Detect citations in any AI response and resolve them to a registered Source.

### Architecture (complete)
See [`docs/citation-engine.md`](./docs/citation-engine.md) for the canonical architecture.
- [`docs/source-fingerprinting.md`](./docs/source-fingerprinting.md) — fingerprinting system.
- [`docs/attribution-model.md`](./docs/attribution-model.md) — scoring model + worked example.
- [`docs/fraud-prevention.md`](./docs/fraud-prevention.md) — threat model + 13 defenses.
- [`docs/analytics.md`](./docs/analytics.md) — protocol metrics + dashboards.
- [`docs/future-extensions.md`](./docs/future-extensions.md) — Arc / USDC / Circle / x402 / marketplaces / licensing.
- [`apps/api/prisma/schema.citation-engine.prisma`](./apps/api/prisma/schema.citation-engine.prisma) — append-only schema additions.
- [`apps/api/openapi/citation-engine.yaml`](./apps/api/openapi/citation-engine.yaml) — OpenAPI 3.1 spec.
- [`packages/citation-engine/`](./packages/citation-engine/) — `core/`, `scoring/`, `fingerprinting/`, `matching/`, `registry/`, `analytics/`, `types/`, `interfaces/`, `docs/`, `tests/` (each with its own README).

### Implementation issues
25 implementation tickets live at [`.github/issues/phase-3/`](./.github/issues/phase-3/). See [the index](./.github/issues/phase-3/README.md) for execution order.

### Deliverables (mapped to issues)
- [ ] Pipeline orchestrator (`P3-001`)
- [ ] Discovery + Normalization (`P3-002`, `P3-003`)
- [ ] Multi-signal Matcher + Embedder adapters (`P3-004`, `P3-005`)
- [ ] Fingerprint Generator + versioning + duplicate detection (`P3-006`, `P3-007`)
- [ ] Extraction + 5-type Classification (`P3-008`)
- [ ] AttributionScorer + Policy versioning (`P3-009`, `P3-022`)
- [ ] CreatorResolver + PaymentQuoter (`P3-010`, `P3-011`)
- [ ] CitationRecorder (append-only hash chain) (`P3-012`)
- [ ] Fraud Detection (8 signals + composite) + Dispute queue (`P3-013`, `P3-014`)
- [ ] Prisma migration + pgvector/HNSW (`P3-015`, `P3-021`)
- [ ] Shared Zod schemas + NP_* errors (`P3-016`, `P3-025`)
- [ ] REST controllers for `/v1/citations`, `/v1/attributions`, `/v1/fingerprints` (`P3-017`)
- [ ] Analytics Indexer + REST analytics (`P3-018`, `P3-019`)
- [ ] Rate limiting + Embedding cache warming (`P3-020`, `P3-023`)
- [ ] Full end-to-end acceptance test (`P3-024`)

### Acceptance
- Given a 500-word AI response citing 4 sources, the engine emits ≥3 CitationEvents with confidence ≥ 0.78 on a held-out test set.
- Every emitted event carries an auditable trail (input text, candidates, scores, resolved source).
- Sum-to-one attribution: every Attribution's contribution fractions sum to 1.0 ± 1e-9.
- pgvector HNSW index returns top-50 nearest neighbors in <50ms for a registry of 10M+ Sources.

---

## Phase 4 — AI Research Agent ⬜ Planned  · Lepton-tagged

**Goal:** Ship the reference implementation of an agent that uses the protocol — so judges and integrators can see NanoProof working end-to-end.

### Deliverables
- [ ] Reference research agent (Next.js app at `apps/web/research`)
- [ ] Streaming chat UI with cited sources
- [ ] Tool-call integration for structured citations
- [ ] Live citation count + per-response cost display
- [ ] Demo video script + ≤3-min recording for submission

### Acceptance
- A user can ask a question, see a streaming answer with citations, and watch testnet USDC flow to creators in real time.
- The demo video fits within the Lepton ≤3-min submission constraint.

---

## Phase 5 — Payment Engine ⬜ Planned  · Lepton-tagged

**Goal:** Execute the per-citation payouts via Circle Gateway + x402 + Arc settlement.

### Deliverables
- [ ] `packages/payment-engine` with quote → aggregate → sign → batch → settle pipeline
- [ ] Circle Gateway client with batching
- [ ] x402 challenge sign + verify implementation
- [ ] Arc L1 client (viem-based) for USDC transfers
- [ ] Idempotent PaymentIntent lifecycle
- [ ] Webhook receivers for Circle + Arc finality events
- [ ] LedgerEntry writes with txHash anchoring

### Acceptance
- An agent can submit 100 CitationEvents across 4 creators and see 4 payouts settle on Arc in <2s end-to-end, with all receipts verifiable on ArcScan.
- Idempotency test: re-submitting the same intent never double-pays.

---

## Phase 6 — Analytics Dashboard ⬜ Planned

**Goal:** Give creators visibility into how their work is being cited and what they're earning.

### Deliverables
- [ ] Per-source citation volume (24h / 7d / 30d)
- [ ] Earnings chart (cumulative + per-period)
- [ ] Top-cited works ranking
- [ ] AI traffic patterns (which agents, which prompts surface the work)
- [ ] Per-citation drill-down with the full context window from the agent response
- [ ] CSV export for creator accounting

### Acceptance
- A creator with 50 registered sources can identify their top-3 cited works and the agents citing them within 30 seconds.

---

## Phase 7 — Arc Integration ⬜ Planned

**Goal:** Deep integration with the Arc + Circle Agent Stack as a flagship partner primitive.

### Deliverables
- [ ] `CitationRegistry.sol` deployed to Arc testnet
- [ ] `PaymentRouter.sol` deployed to Arc testnet
- [ ] `CitationReceipt.sol` events indexed via ArcScan
- [ ] Faucet integration for new creators
- [ ] Joint demo with Canteen team for Circle ecosystem channels
- [ ] `arc`-tagged metrics in the public dashboard

### Acceptance
- Every payout shows up on ArcScan within 2s of execution.
- A new creator can onboard from a Canteen-hosted Arc testnet RPC without manual config.

---

## Phase 8 — Protocol SDK ⬜ Planned

**Goal:** Ship a stable, versioned, framework-agnostic SDK that any AI agent can drop in.

### Deliverables
- [ ] `@nanoproof/sdk` with TypeScript-first API
- [ ] Framework adapters: Vercel AI SDK, LangChain, LlamaIndex, custom
- [ ] OpenAPI spec auto-published at `docs.openapi.nanoproof.xyz`
- [ ] Reference implementations in 3+ languages (TS, Python, Go)
- [ ] npm + PyPI + Go module publishing
- [ ] SemVer-stable v1.0.0 release

### Acceptance
- A third-party developer can wire NanoProof into a Vercel AI SDK agent in ≤10 lines of code.
- All public APIs follow SemVer; breaking changes ship on a major with a migration guide.

---

## Phase 9 — Public Beta ⬜ Planned

**Goal:** Open the protocol to external creators, agents, and integrators. Prove retention and usage at small scale.

### Deliverables
- [ ] Self-serve creator onboarding with no invite gate
- [ ] Public agent developer portal with API key issuance
- [ ] First 1,000 registered creators, 100 registered agents, 10M+ nanopayments settled
- [ ] Public protocol governance process documented (lightweight, offchain-first)
- [ ] First major protocol upgrade (v1.1) shipped with creator + agent feedback
- [ ] Independent gateway implementation by a third party
- [ ] Public launch post on Canteen + Circle + Arc channels

### Acceptance
- 30-day retention ≥ 40% for creators with ≥10 sources.
- Median per-payout latency (citation → Arc settlement) ≤ 2s.
- At least one third-party gateway ships against the open spec.

---

## Long-term Bets (post-beta)

- **Multimodal citations** — image provenance, music samples, video snippets, dataset rows.
- **Recursive royalty splits** — co-authors and remixers paid automatically.
- **Citation futures** — transferable claims on a creator's future tip + subscription flow.
- **Agent-side budget APIs** — daily caps, cost-benefit analyzers, smart routing.
- **Chain portability** — the same spec settling on Tempo, Base, and any chain that meets the per-payment cost bar.

---

## Tracking

- **Active work:** [GitHub Project board](https://github.com/networkbike/nanoproof-protocol/projects)
- **Issues:** [github.com/networkbike/nanoproof-protocol/issues](https://github.com/networkbike/nanoproof-protocol/issues)
- **Lepton submission checklist:** [`docs/lepton-submission.md`](./docs/lepton-submission.md)

---

<div align="center">
<sub>Have a phase you're excited about? Pick it up — open an issue or PR with the phase tag.</sub>
</div>