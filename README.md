# NanoProof Protocol

> **Open infrastructure for autonomous creator compensation.**
> AI agents automatically pay creators USDC whenever their work is cited — on Arc, via x402, verified on ArcScan.

[![Version](https://img.shields.io/badge/version-1.0.0--rc.1-blue)](./CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9-F69220)](https://pnpm.io/)
[![Live Demo](https://img.shields.io/badge/live-railway-6f42c1)](https://nanoproof-web-production.up.railway.app)
[![Status](https://img.shields.io/badge/status-v1.0.0--rc.1-brightgreen)](./STATUS.md)
[![Track](https://img.shields.io/badge/hackathon-Lepton-FF6B6B)](https://lepton.thecanteenapp.com/)

**Try the live demo:** [nanoproof-web-production.up.railway.app/landing](https://nanoproof-web-production.up.railway.app/landing) — no signup, no install.

---

## The problem

Every time an LLM cites a creator's work — a research paper, a tutorial, an article, a dataset — **the creator gets nothing**. No payment. No notification. No proof.

There are roughly 200M creators whose work AI agents consume every day. None of them are getting paid.

## What NanoProof does

When an AI agent cites a Source, NanoProof:

1. **Detects** the citation in the agent's response (deterministic pattern + AI classifier).
2. **Attributes** it to the right Creator via registered wallet, domain, or platform handle.
3. **Pays** the Creator a fraction of a cent in USDC on Arc, gasless (USDC-native gas).
4. **Settles** the payment through Coinbase's open HTTP 402 standard (`x402`).
5. **Verifies** the on-chain transaction via ArcScan (Blockscout v2).
6. **Hash-chains** every SettlementProof so anyone can audit the entire payment history for any creator.

```
User asks LLM → LLM cites creator's Source → NanoProof detects
  → x402 402 challenge → agent signs EIP-3009 USDC auth → Arc settles
    → ArcScan verifies → SettlementProof hash-chained → Creator notified
```

## Live metrics (production)

| Citations | Settled payments | USDC distributed | AI agents |
|---|---|---|---|
| **51** | **269** | **$0.97** | **5** (ChatGPT, Claude, Gemini, Perplexity, Copilot) |

Refresh numbers: `curl https://nanoproof-api-production.up.railway.app/metrics`

For full audit see [STATUS.md](./STATUS.md).

## What's in this repo

| Path | What |
|---|---|
| `apps/api` | NestJS 11 + Prisma 6 backend, 62 TS files, 38 e2e tests + 24 unit tests |
| `apps/web` | Next.js 15 + React 19 dashboard + landing + sign-in + tour |
| `packages/shared` | Zod schemas, NP_* error catalog, atomic-USDC utilities |
| `packages/agent` | Citation detection + attribution runtime |
| `docs/` | 38 docs including JUDGE_GUIDE, SUBMISSION, ARCHITECTURE, TERMUX_SETUP |
| `scripts/` | `termux-install-fast.sh` (one-shot Android bootstrap) and friends |
| `STATUS.md` | Current state, live URLs, what's green vs yellow |
| `ARCHITECTURE.md` | System design, principles, layered view |
| `CHANGELOG.md` | 11 phases shipped, one line per change |

## Quickstart

Two paths — pick yours.

### 🟢 Path A — Linux or macOS with Docker (5 min)

```bash
git clone https://github.com/networkbike/nanoproof-protocol.git
cd nanoproof-protocol
pnpm install
docker compose up -d                # postgres + redis
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm --filter @nanoproof/api db:migrate
pnpm --filter @nanoproof/api db:seed
pnpm dev
# → api: http://localhost:4000   web: http://localhost:3000
```

### 📱 Path B — Android phone via Termux (15 min)

```bash
# In Termux on Android:
cd ~/nanoproof-protocol
bash scripts/termux-install-fast.sh

# Then in three separate Termux tabs:
#   Tab 1: cd ~/nanoproof-protocol/apps/api
#          ./node_modules/.bin/pglite-server --port=5432 --db=$HOME/nanoproof-data
#   Tab 2: cd ~/nanoproof-protocol/apps/api
#          DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
#            PORT=4000 node dist/apps/api/src/main.js
#   Tab 3: cd ~/nanoproof-protocol/apps/web
#          NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 npm run dev

# Chrome on the phone → http://127.0.0.1:3000
```

No Docker required — pglite (Postgres compiled to WASM) replaces the database. Full guide: [docs/TERMUX_SETUP.md](./docs/TERMUX_SETUP.md).

### ☁️ Path C — Zero install (live demo)

```
https://nanoproof-web-production.up.railway.app/landing
```

Real Resend emails for sign-up. Real Arc testnet settlements. Real ArcScan verification links. Real viem-generated MetaMask-importable wallets.

## Project status

| | |
|---|---|
| Version | **v1.0.0-rc.1** |
| Phases shipped | **11** (Phase 0 → Phase 11) |
| Tests | **85 / 85 passing** (62 unit + 23 e2e + integration) |
| License | **MIT** |
| Live deployment | **Railway (api + web)** |
| Open issues | **0 critical** |

Full status: [STATUS.md](./STATUS.md). Changelog: [CHANGELOG.md](./CHANGELOG.md).

## Documentation

- **[STATUS.md](./STATUS.md)** — current state, live URLs, what's shipped
- **[docs/JUDGE_GUIDE.md](./docs/JUDGE_GUIDE.md)** — 60-second walkthrough for hackathon judges
- **[docs/SUBMISSION.md](./docs/SUBMISSION.md)** — pre-filled Lepton submission form
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — system design, principles, layered view
- **[docs/X402_IMPLEMENTATION.md](./docs/X402_IMPLEMENTATION.md)** — x402 protocol deep dive
- **[docs/PAYMENT_FLOW.md](./docs/PAYMENT_FLOW.md)** — full request lifecycle
- **[docs/ARC_SETTLEMENT.md](./docs/ARC_SETTLEMENT.md)** — SettlementProof + ArcScan verification
- **[docs/API_REFERENCE.md](./docs/API_REFERENCE.md)** — complete REST API reference
- **[docs/TERMUX_SETUP.md](./docs/TERMUX_SETUP.md)** — running on Android Termux (no Docker)
- **[docs/RUNBOOK.md](./docs/RUNBOOK.md)** — operational guide for the deployed system
- **[docs/PRESENTATION.md](./docs/PRESENTATION.md)** — 3-minute presentation script

Earlier phases: Phase 0 (MVP) → Phase 2 (Creator Registry) → Phase 3 (Citation Engine) → Phase 4 (Payment Engine) → Phase 5 (Lepton Demo) → Phase 6 (Analytics Dashboard) → Phase 7 (Deployment configs) → Phase 8 (x402 + Arc Settlement Proof) → Phase 9 (Polish) → Phase 10 (Frontend) → Phase 11 (Per-user auth).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). All contributions welcome — bugs, features, docs, tests.

## Security

See [SECURITY.md](./SECURITY.md). Please report vulnerabilities via the disclosure process, not as public issues.

## License

MIT — see [LICENSE](./LICENSE).

---

<sub>Built during the Lepton Agents Hackathon · Canteen × Circle × Arc · Jul 2026</sub>