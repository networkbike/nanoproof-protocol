<div align="center">

# NanoProof Protocol

**The open infrastructure layer for autonomous creator compensation.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Status: Pre-Alpha](https://img.shields.io/badge/status-pre--alpha-orange.svg)](./ROADMAP.md)
[![Settlement: Arc](https://img.shields.io/badge/settlement-Arc%20L1-0A0A0A.svg)](https://arc.io)
[![Payments: USDC](https://img.shields.io/badge/payments-USDC-2775CA.svg)](https://www.circle.com/en/usdc)
[![Built by: Canteen × Circle Lepton Hackathon](https://img.shields.io/badge/built%20at-Lepton%20Hackathon-7B3FF2.svg)](https://lepton.thecanteenapp.com/)

[Overview](#project-overview) · [Architecture](./ARCHITECTURE.md) · [Roadmap](./ROADMAP.md) · [Contributing](./CONTRIBUTING.md) · [Security](./SECURITY.md)

</div>

---

## Project Overview

**NanoProof Protocol** is an open, permissionless infrastructure layer that lets AI agents automatically compensate human creators with **instant USDC nanopayments** whenever an AI-generated response cites, references, or builds on a creator's original work.

We call this **citation-level compensation**.

Every paragraph, image, song, dataset, or piece of code has a creator behind it. As AI agents consume and synthesize content from across the web at scale, the humans who produced that source material receive nothing. NanoProof flips the default: when an agent's response lands on a screen, the creators whose work made that response possible get paid — in testnet USDC on Arc, in fractions of a cent, settled in under 500 milliseconds.

This is not a payment app. It is the **protocol layer** between AI consumption and human production — a primitive that any agent, any framework, any application can integrate against, the same way HTTP sits between browsers and servers.

---

## Problem Statement

The economics of the open web are broken at the foundation.

1. **The payment floor has priced out creators.** Subscriptions, ads, and tip jars all require either an audience large enough to amortize overhead or a reader willing to commit to recurring payments. A single cited paragraph in a 2,000-word AI response generates roughly $0 of attribution value to the source creator today.

2. **AI agents consume content at machine speed.** A single research agent can ingest 200 articles to produce one answer. There is no standard mechanism to route fractional value back to the authors whose work made the answer possible.

3. **The plumbing for sub-cent payments finally exists.** Arc L1 settles USDC in under 500 ms with gas below a cent. Circle's x402 protocol and Gateway batching make it economically viable to pay $0.000001 per call. The rail is solved. The protocol is not.

4. **No standard exists for citation provenance.** When an LLM cites a source, there is no cryptographic proof linking the citation to a payment obligation. Creators cannot enforce, audit, or opt into the flow.

NanoProof exists to fix this.

---

## Solution

NanoProof provides a four-layer protocol stack:

| Layer | Function |
|-------|----------|
| **Creator Registry** | Creators register canonical sources (URLs, content fingerprints, content licenses) and attach a USDC payout wallet. |
| **Citation Engine** | Detects citations inside AI responses, scores them by relevance, and resolves each citation back to a registered creator. |
| **Payment Engine** | Computes per-citation payouts, batches them through Circle Gateway, and broadcasts to Arc via x402. |
| **Verification Layer** | Anchors every citation-payment pair onchain with a verifiable transaction hash, viewable on ArcScan. |

A single integration call from any AI agent SDK is enough to start paying creators automatically. Creators integrate with one line of HTML/JS — and their work becomes payable by every agent that uses the network.

---

## Core Features

- 🚀 **Citation-Level Compensation** — pay per cited paragraph, image, dataset, or code snippet.
- ⚡ **Sub-Second Settlement** — Arc L1 finality, ~$0.01 USDC fees, batched via Circle Gateway.
- 🔌 **Framework-Agnostic SDK** — drop-in TypeScript SDK for Next.js, Vercel AI SDK, LangChain, custom agents.
- 🧾 **Onchain Receipts** — every payout is anchored on Arc and verifiable via ArcScan.
- 🪙 **Self-Custodial Payouts** — creators control their own Arc wallet; NanoProof is never custodial.
- 🔍 **Transparent Attribution** — public dashboard exposes every citation and every payment for audit.
- 🪶 **Open Standard** — protocol spec is MIT-licensed and open to forks, gateways, and competing implementations.
- 📊 **Creator Analytics** — per-source citations, per-period revenue, top-cited works, AI traffic patterns.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Agents / Applications                  │
│   (LangChain, Vercel AI SDK, custom agents, chatbots)        │
└──────────────────────────┬──────────────────────────────────┘
                           │ citation events
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Citation Engine                         │
│   detect → score → resolve → attest                         │
└──────────────────────────┬──────────────────────────────────┘
                           │ resolved creators + amounts
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Payment Engine                          │
│   quote → batch → x402 → Arc settlement                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ signed tx hash
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Arc L1 (Circle Stablecoin Network)             │
│   USDC gas · <500ms finality · ArcScan-verifiable           │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │ registry writes
┌──────────────────────────┴──────────────────────────────────┐
│                    Creator Registry                         │
│   creators · sources · fingerprints · payout wallets        │
└─────────────────────────────────────────────────────────────┘
```

Full architecture breakdown lives in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Technology Stack

### Frontend
- **Next.js 15** (App Router, RSC, edge runtime)
- **TypeScript 5.x** (strict)
- **TailwindCSS 4**
- **shadcn/ui** (Radix-based, accessible component primitives)

### Backend
- **NestJS 11** (modular DI, OpenAPI auto-gen)
- **PostgreSQL 16** (Neon serverless in prod)
- **Prisma 6** (typed ORM, migrations)
- **Clerk** (auth, organizations, webhooks)

### AI
- **OpenAI-compatible architecture** (works with OpenAI, Anthropic via adapter, Together, OpenRouter, local vLLM)
- **Vercel AI SDK** for streaming + tool definitions

### Protocol & Payments
- **Circle Agent Stack** (USDC, Gateway, CCTP)
- **x402 protocol** (HTTP 402 payment-required flow)
- **Arc L1** (settlement chain)
- **ArcScan** (verification)

### Infrastructure
- **Vercel** — frontend + edge
- **Railway** — NestJS API + workers
- **Neon** — Postgres

### Tooling
- **pnpm workspaces** + **Turborepo**
- **Vitest** + **Playwright**
- **ESLint** + **Prettier** + **Husky** + **lint-staged**
- **Changesets** for versioning
- **GitHub Actions** for CI

---

## Repository Structure

```
nanoproof-protocol/
├── apps/
│   ├── web/              # Next.js creator + agent dashboards
│   └── api/              # NestJS REST + WebSocket API
│
├── packages/
│   ├── sdk/              # Drop-in TS SDK for AI agent integrations
│   ├── citation-engine/  # Citation detection + resolution
│   ├── payment-engine/   # x402 + Gateway batching + Arc settlement
│   └── shared/           # Zod schemas, types, constants
│
├── contracts/            # Solidity contracts (Arc-compatible)
│
├── docs/                 # Specs, ADRs, integration guides
│
├── scripts/              # DevOps + ops scripts
│
├── .github/              # Workflows, issue + PR templates
│
├── README.md
├── ARCHITECTURE.md
├── ROADMAP.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
└── CODE_OF_CONDUCT.md
```

---

## Quick Start

> ⚠️ **Status: Pre-Alpha.** The current release contains repository scaffolding, protocol specifications, and architectural documentation. Application code lands in Phase 1–2 of the [Roadmap](./ROADMAP.md).

### Prerequisites
- **Node.js** ≥ 20.18.2
- **pnpm** ≥ 9
- **PostgreSQL** ≥ 16 (or a [Neon](https://neon.tech) URL)
- **Arc testnet RPC** access — get one via the [ARC CLI](https://github.com/the-canteen-dev/ARC-cli): `uv tool install git+https://github.com/the-canteen-dev/ARC-cli`
- **Circle testnet USDC** — request from the [Arc testnet faucet](https://faucet.arc.io)

### Clone

```bash
git clone https://github.com/networkbike/nanoproof-protocol
cd nanoproof-protocol
pnpm install
```

### Local development (coming in Phase 1)

```bash
pnpm dev          # runs all apps + packages in watch mode
pnpm test         # runs Vitest across the workspace
pnpm build        # builds every package
pnpm lint         # ESLint + Prettier checks
```

### Hackathon quickstart (Lepton judges)

```bash
# 1. Get a Canteen-hosted Arc testnet RPC
uv tool install git+https://github.com/the-canteen-dev/ARC-cli

# 2. Install Circle CLI
npm install -g @circle-fin/cli

# 3. Clone the demo
git clone https://github.com/networkbike/nanoproof-protocol
cd nanoproof-protocol && pnpm install

# 4. Fund a testnet USDC wallet
arc faucet <your-address>

# 5. Run the citation-payment demo
pnpm demo
```

---

## Development Roadmap

The full roadmap lives in [`ROADMAP.md`](./ROADMAP.md). Quick view:

| Phase | Name | Status |
|-------|------|--------|
| 1 | Repository Foundation | 🟡 In Progress |
| 2 | Creator Registry | ⬜ Planned |
| 3 | Citation Engine | ⬜ Planned |
| 4 | AI Research Agent | ⬜ Planned |
| 5 | Payment Engine | ⬜ Planned |
| 6 | Analytics Dashboard | ⬜ Planned |
| 7 | Arc Integration | ⬜ Planned |
| 8 | Protocol SDK | ⬜ Planned |
| 9 | Public Beta | ⬜ Planned |

---

## Future Vision

NanoProof starts with citations. It does not end there.

- **Multimodal citations** — image provenance, music samples, video snippets, dataset rows.
- **Recursive royalty splits** — co-authors, contributors, and remixers all paid automatically per use.
- **Citation futures** — a transferable claim on a creator's future tip + subscription flow, priced like an early-backer's position.
- **AI-side budget APIs** — agents with daily caps, cost-benefit analyzers, smart routing to cheapest citation source.
- **Protocol-portable** — the same spec should settle on Arc, Tempo, and any chain that meets the per-payment cost bar.

The long-term bet: when every agent is paying every creator at the smallest unit, the open web's economics finally work for the people producing it.

---

## Contributing

We welcome contributions from engineers, researchers, creators, and protocol designers. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for workflow, style, and PR standards.

For security issues, please follow [`SECURITY.md`](./SECURITY.md). **Do not open public issues for vulnerabilities.**

---

## License

[MIT](./LICENSE) © 2026 NanoProof Protocol Contributors.

---

## Acknowledgements

NanoProof is being incubated during the [Lepton Agents Hackathon](https://lepton.thecanteenapp.com/) hosted by [Canteen](https://thecanteenapp.com) in partnership with [Circle](https://www.circle.com) on [Arc](https://arc.io). Built on the shoulders of the open AI and open payments communities.

<div align="center">
<sub>Built with care by the NanoProof Protocol contributors.</sub>
</div>