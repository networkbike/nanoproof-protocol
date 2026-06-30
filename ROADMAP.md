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

### Deliverables
- [ ] `Creator` and `Source` Prisma models with migrations
- [ ] `POST /api/creators`, `POST /api/sources` endpoints with Zod validation
- [ ] Wallet connect via RainbowKit (Arc testnet + mainnet-ready)
- [ ] Source fingerprinting service (SHA-256 + perceptual hash for media)
- [ ] Creator dashboard MVP at `/dashboard`
- [ ] Source registration UI at `/dashboard/sources/new`
- [ ] Payout settings (default per-citation price, royalty splits, period cap)

### Acceptance
- A creator can sign up, connect a wallet, register 3 sources, and see them listed in the dashboard.
- A creator can configure a 70/30 split between two payout addresses.

---

## Phase 3 — Citation Engine ⬜ Planned  · Lepton-tagged

**Goal:** Detect citations in any AI response and resolve them to a registered Source.

### Deliverables
- [ ] `packages/citation-engine` with embedder interface
- [ ] OpenAI, Cohere, Voyage embedder adapters
- [ ] URL + DOI + ISBN regex extractor
- [ ] Embedding similarity scorer with configurable threshold
- [ ] Resolution client against the Creator Registry
- [ ] `CitationEngine.extract()` public API with full event log
- [ ] Unit tests with deterministic fixtures

### Acceptance
- Given a 500-word AI response citing 4 sources, the engine emits ≥3 CitationEvents with confidence ≥ 0.78 on a held-out test set.
- Every emitted event carries an auditable trail (input text, candidates, scores, resolved source).

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