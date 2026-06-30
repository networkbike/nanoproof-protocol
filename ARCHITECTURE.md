# NanoProof Protocol — Architecture

> **Status:** Living document. Updated as the protocol is implemented. Each section links to its current code, ADR, or design doc where applicable.

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [System Overview](#system-overview)
3. [Layer 1 — Frontend](#layer-1--frontend)
4. [Layer 2 — Backend](#layer-2--backend)
5. [Layer 3 — Database](#layer-3--database)
6. [Layer 4 — AI Layer](#layer-4--ai-layer)
7. [Layer 5 — Citation Engine](#layer-5--citation-engine)
8. [Layer 6 — Payment Engine](#layer-6--payment-engine)
9. [Layer 7 — Smart Contract Layer](#layer-7--smart-contract-layer)
10. [Layer 8 — Deployment & Infrastructure](#layer-8--deployment--infrastructure)
11. [Data Flow Walkthroughs](#data-flow-walkthroughs)
12. [Cross-Cutting Concerns](#cross-cutting-concerns)

---

## Design Principles

1. **Creators come first.** Every architectural decision favors the producer of source content. They are the supply side of the agent economy and the reason the protocol exists.
2. **Non-custodial by default.** NanoProof never holds creator funds. Payouts go directly from agent wallet to creator wallet. The protocol's role is attestation + routing, not custody.
3. **Standards over products.** The spec, the schemas, and the API contracts are first-class outputs. Anyone should be able to build a competing gateway, indexer, or dashboard against the same primitives.
4. **Hackathon-grade UI, venture-grade core.** The frontend ships fast and looks great. The backend, smart contracts, and settlement path are written for production from day one.
5. **Composable, not monolithic.** Each layer (registry, citation, payment, verification) can be replaced independently. Competing implementations are welcomed.

---

## System Overview

NanoProof is a horizontally-scalable protocol with four runtime planes and one offline plane:

```
   ┌──────────────────────────────────────────────────────────────┐
   │                  CLIENT PLANE                                │
   │   Creator Dashboard · Agent SDK · Public Analytics Site      │
   └──────────────────┬───────────────────────────────────────────┘
                      │
   ┌──────────────────▼───────────────────────────────────────────┐
   │                   EDGE / API PLANE                           │
   │   Next.js Edge (Vercel) · NestJS API (Railway) · WebSockets  │
   └──────────────────┬───────────────────────────────────────────┘
                      │
   ┌──────────────────▼───────────────────────────────────────────┐
   │                  PROTOCOL PLANE                              │
   │   Citation Engine · Payment Engine · Indexer · Verifier      │
   └──────────────────┬───────────────────────────────────────────┘
                      │
   ┌──────────────────▼───────────────────────────────────────────┐
   │                  SETTLEMENT PLANE                            │
   │   Arc L1 · Circle Gateway · x402 Protocol · CCTP Bridge      │
   └──────────────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────────────┐
   │                 OFFLINE PLANE (batch)                        │
   │   Embeddings pipeline · Citation graph rebuild · Rewards     │
   └──────────────────────────────────────────────────────────────┘
```

The architecture is intentionally **layered**. Each plane can scale, fail, and be replaced independently.

---

## Layer 1 — Frontend

**Location:** `apps/web`
**Stack:** Next.js 15 (App Router), TypeScript 5, TailwindCSS 4, shadcn/ui

### Responsibilities
- Creator onboarding (wallet connect, source registration, payout settings).
- Source registration UI (paste URL, upload content fingerprint, set royalty splits).
- Creator dashboard (citation volume, earnings, top-cited works, payout history).
- Agent developer portal (API keys, integration snippets, live transaction feed).
- Public analytics site (transparent ledger of citations and payments).
- Marketing site + documentation.

### Architectural choices
- **App Router + RSC** for the marketing site + dashboards (low TTFB, SEO).
- **Route Handlers** for the small surface of public endpoints the frontend needs server-side.
- **TanStack Query** for client-side data fetching against the NestJS API.
- **shadcn/ui** primitives for accessible, themeable, copy-paste components.
- **next-themes** for dark/light mode (creators spend hours in these dashboards).
- **Wallet UI via RainbowKit** (wagmi + viem) for Arc testnet and mainnet connections.

### Non-goals
- No server-side persistence beyond Vercel KV cache.
- No business logic — every mutation routes through the API.

---

## Layer 2 — Backend

**Location:** `apps/api`
**Stack:** NestJS 11, PostgreSQL 16 (via Prisma 6), Clerk (auth)

### Module map

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

### Responsibilities
- **Authoritative store** for creators, sources, citation events, payment intents, ledger entries.
- **OpenAPI spec generation** via `@nestjs/swagger` — the spec is the public contract.
- **Webhook receivers** for Circle (payment confirmations), Arc (block finality), Clerk (lifecycle).
- **Rate limiting + quota enforcement** for agent API keys.
- **Background workers** for batch payment orchestration, royalty splits, citation graph rebuilds.

### Architectural choices
- **Modular DI** keeps dependencies explicit and testable.
- **Zod schemas** (from `packages/shared`) are the single source of truth for request/response shapes.
- **Prisma** for type-safe DB access; raw SQL only for analytics aggregations that need to bypass the ORM.
- **BullMQ + Redis** (Railway-managed) for payment batching + retries.
- **Clerk** for auth — handles magic links, passkeys, organizations, and webhook lifecycle.

### Non-goals
- No AI inference happens in the API. The API is the orchestration plane, not the intelligence plane.

---

## Layer 3 — Database

**Stack:** PostgreSQL 16 on Neon (serverless), Prisma 6

### Schema (top-level)

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Creator    │ 1───*   │    Source    │ 1───*   │   Citation   │
└──────────────┘         └──────────────┘         └──────┬───────┘
                                                         │
                                                         │ *───1
                                                         ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Payment    │ 1───*   │ LedgerEntry  │  *───1  │     Agent    │
└──────────────┘         └──────────────┘         └──────────────┘
```

### Core tables

- **Creator** — wallet addresses, profile, payout settings, splits.
- **Source** — canonical URL, content fingerprint (SHA-256 + perceptual hash), license metadata, optional embed vector.
- **Citation** — pointer from agent response → source, with relevance score, context window, and resolution confidence.
- **Agent** — developer accounts, API keys, rate limit tier.
- **PaymentIntent** — aggregation of citations queued for a single creator for a single period.
- **LedgerEntry** — immutable onchain-anchored receipt per payout.
- **WebhookEvent** — dedup table for inbound webhooks.

### Design choices
- **Serverless Neon** in production for branchable, autoscaling Postgres.
- **Read replicas** (via Neon) for analytics workloads.
- **Migrations** via Prisma Migrate, versioned and replayable from a fresh DB.
- **No DB-level enums for evolving statuses** — use string columns with Zod-validated union types in code.

### Non-goals
- The DB is **not** the source of truth for settlement. Arc L1 is. The DB holds the intent; Arc holds the proof.

---

## Layer 4 — AI Layer

**Stack:** OpenAI-compatible architecture, Vercel AI SDK, optional LangChain adapter

### Responsibilities
- Provide the **research agent** reference implementation that consumes the SDK.
- Generate citations for the demo (agent uses GPT-class models to produce structured responses with cited sources).
- Act as the canonical **integration shape** any third-party agent can copy.

### Provider abstraction

```typescript
// packages/sdk/src/providers/llm.ts
export interface LLMProvider {
  complete(prompt: Prompt, opts?: CompleteOpts): Promise<Completion>;
  stream(prompt: Prompt, opts?: StreamOpts): AsyncIterable<Token>;
}
```

Implementations: `openai`, `anthropic` (via adapter), `openrouter`, `together`, `local-vllm`.

### Citation extraction

Two strategies, both pluggable:
1. **Native citations** — models that emit structured citation objects in their tool/function-call output.
2. **Post-hoc extraction** — regex + embedding similarity + URL parser to detect source references in free-form text.

### Non-goals
- We are not building an LLM. We are building the protocol layer that pays the humans behind the LLM's training data, in real time, per cited work.

---

## Layer 5 — Citation Engine

**Location:** `packages/citation-engine`

### Responsibilities
- Detect citation candidates in an AI response.
- Score each candidate by relevance + confidence.
- Resolve each candidate to a registered Source in the registry.
- Produce a `CitationEvent` that flows downstream to the Payment Engine.

### Pipeline

```
Raw AI response
    │
    ▼
[1] Tokenize + segment ───────► paragraphs / sentences / code blocks
    │
    ▼
[2] Candidate detection ──────► regex URLs, DOIs, ISBNs, named sources
    │
    ▼
[3] Embedding similarity ─────► compare to source fingerprints
    │
    ▼
[4] Resolve to Source ────────► hit registry; confidence ≥ τ = accepted
    │
    ▼
[5] Emit CitationEvent ───────► API ingests, queues for payment
```

### Public API

```typescript
import { CitationEngine } from "@nanoproof/citation-engine";

const engine = new CitationEngine({
  registry: registryClient,
  embedder: openAIEmbeddings,
  threshold: 0.78,
});

const events = await engine.extract({
  responseId,
  responseText,
  modelId,
});
```

### Design choices
- **Pluggable embedders** — same interface works for OpenAI, Cohere, Voyage, or local.
- **Threshold τ is per-source** — high-authority sources get stricter matching.
- **Deterministic + auditable** — every CitationEvent carries the input text, the candidates, the scores, and the resolved Source ID.

### Non-goals
- This is not a plagiarism detector. It is a citation revenue router.

---

## Layer 6 — Payment Engine

**Location:** `packages/payment-engine`

### Responsibilities
- Quote a payment amount per CitationEvent based on the source's policy.
- Aggregate CitationEvents into PaymentIntents per creator per period.
- Execute payouts via **Circle Gateway** (batched) + **x402** (per-call).
- Anchor each payout on Arc with a verifiable transaction hash.
- Emit LedgerEntries to the API for the dashboard.

### Pipeline

```
CitationEvent stream
    │
    ▼
[1] Quote ────────────────────► per-source price × relevance × period cap
    │
    ▼
[2] Aggregate ────────────────► PaymentIntent(creator, period, total)
    │
    ▼
[3] Sign x402 envelope ───────► HTTP 402 challenge, off-chain USDC auth
    │
    ▼
[4] Batch via Gateway ────────► Circle Gateway batches micro-payouts
    │
    ▼
[5] Settle on Arc ────────────► USDC.transfer() · <500ms finality
    │
    ▼
[6] Record receipt ───────────► LedgerEntry(txHash, amount, sources)
```

### Pricing model

- **Base price** per source, set by the creator (e.g. $0.001 / citation).
- **Relevance multiplier** from the Citation Engine (0.5× – 2×).
- **Period cap** per agent per source to prevent runaway costs.
- **Minimum payout** $0.0001 — sub-floor citations accumulate as creator credit.

### Public API

```typescript
import { PaymentEngine } from "@nanoproof/payment-engine";

const engine = new PaymentEngine({
  circle: circleClient,
  arc: arcClient,
  gateway: gatewayClient,
});

const intent = await engine.createIntent({
  creatorId,
  citations: [...events],
});

await engine.execute(intent);   // signs, batches, settles, returns txHash
```

### Design choices
- **Off-chain x402 first, onchain settlement second.** Most payout value moves through x402 challenges; only final settlement touches Arc.
- **Gasless batching via Gateway** so creators don't pay gas to receive.
- **Idempotent intents** — every PaymentIntent carries a UUID; retries never double-pay.
- **Receipts are public** — anyone can verify on ArcScan.

---

## Layer 7 — Smart Contract Layer

**Location:** `contracts/`
**Stack:** Solidity 0.8.x, Foundry, Arc-compatible

### Contracts

- **`CitationRegistry.sol`** — onchain anchor for Source fingerprints and ownership claims.
- **`PaymentRouter.sol`** — distributes USDC from agent escrow to creator wallets with per-source splits.
- **`CitationReceipt.sol`** — emits a `CitationPaid(sourceId, agentId, amount, txHash)` event per payout.

### Design choices
- **Minimal onchain surface.** Most logic stays offchain. The contracts exist for verifiable settlement, not business logic.
- **USDC-only.** No wrapped assets, no native gas token dependence.
- **Upgrade-safe but not upgradeable.** V1 ships immutable; v2 introduces a proxy if the protocol governance demands it.

### Non-goals
- We are not building a token. We are not building a DAO. NanoProof is infrastructure, not a treasury.

---

## Layer 8 — Deployment & Infrastructure

### Environments
| Env | Frontend | API | DB | Branch |
|-----|----------|-----|----|--------|
| **local** | `next dev` | `nest start --watch` | Docker Postgres | any |
| **preview** | Vercel preview | Railway preview | Neon branch | PR |
| **staging** | Vercel | Railway | Neon | `main` |
| **production** | Vercel | Railway | Neon | tagged release |

### Tooling
- **Vercel** — frontend + edge functions; preview deploys per PR.
- **Railway** — NestJS API + BullMQ workers + Redis.
- **Neon** — serverless Postgres with branch-per-PR.

### Observability
- **Sentry** — frontend + API error tracking.
- **Axiom** — log aggregation + dashboards.
- **ArcScan** — onchain transaction verification (public).

### CI/CD (`.github/workflows/`)
- `ci.yml` — lint, type-check, test, build on every PR.
- `release.yml` — changesets → version → publish on `main`.
- `audit.yml` — weekly dependency audit.
- `deploy-preview.yml` — Vercel + Railway preview per PR.

---

## Data Flow Walkthroughs

### Walkthrough A — Creator registers a source

```
1. Creator opens dashboard → signs in via Clerk
2. Dashboard calls POST /api/sources with { url, fingerprint, license, splits }
3. API verifies fingerprint (SHA-256), persists Source, emits SourceCreated
4. Indexer ingests content, computes embedding, updates registry
5. Source is now payable by any agent that cites it
```

### Walkthrough B — Agent compensates a creator on a citation

```
1. Agent SDK receives a user prompt
2. Agent generates response via LLM (with citations in tool output)
3. SDK calls CitationEngine.extract(response) → CitationEvents
4. SDK calls PaymentEngine.pay(events) → x402 envelope signed
5. Circle Gateway batches payouts across creators
6. Arc L1 settles; txHash returned
7. SDK returns response to user with embedded receipts
8. Dashboard updates creator balance in near-real-time
```

---

## Cross-Cutting Concerns

- **Auth & identity** — Clerk for human users (creators, agent devs); API keys for agent-to-protocol.
- **Secrets** — environment variables in Vercel/Railway dashboards; never in the repo.
- **Feature flags** — environment-scoped config via `packages/shared/config`.
- **Versioning** — Changesets for every package; SemVer strictly enforced.
- **API stability** — anything in `@nanoproof/sdk` follows SemVer; breaking changes ship on a major.
- **Data residency** — creators' PII (email, payout splits) lives in the API only; the blockchain layer is fully pseudonymous.

---

## Open Architectural Questions

These are tracked as ADRs in [`docs/adr/`](./docs/adr/). Topics include:

- Should the protocol run on a single chain (Arc-only) or be chain-portable from day one?
- How are malicious citation spam attacks priced out without a token?
- Should creators be able to set per-agent pricing?

See [`docs/adr/0001-chain-portability.md`](./docs/adr/0001-chain-portability.md) for the live decision record.

---

<div align="center">
<sub>Have an architectural question? Open an issue with the <code>architecture</code> label or propose a change via PR.</sub>
</div>