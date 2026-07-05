# Lepton Demo Guide — Creator Analytics Dashboard

> Audience: Lepton judges (5-minute walkthrough) and the team presenting.
> Time budget: 5 minutes total, with 90 seconds for questions.

## Pre-demo (T-15 min)

1. Open a terminal in the `networkbike/nanoproof-protocol` repo.
2. Start the api: `pnpm --filter @nanoproof/api dev`
3. In another terminal: `pnpm --filter @nanoproof/web dev`
4. Open <http://localhost:3000/dashboard> in your browser.
5. **Click "Load Demo Dataset"** in the sidebar (wait ~3 seconds).

If the button errors with "Demo mode disabled", the api wasn't started with
`NANOPROOF_DEMO_MODE=true`. Stop it and restart:

```bash
NANOPROOF_DEMO_MODE=true pnpm --filter @nanoproof/api dev
```

## The 5-minute walkthrough

### 0:00 — Overview (`/dashboard`)

> "This is the NanoProof protocol overview. The KPI strip at the top is the
> hero number — how many creators, how many citations, how much USDC has
> settled. The flow chart beneath shows the chain: Creator → Citation →
> Attribution → Payment → Settlement."

Click on a few KPI cards to drill into the corresponding section.

### 0:45 — Citations (`/dashboard/citations`)

> "This is the citation ledger. Every time an AI agent cites a NanoProof-
> registered source, we log the snippet, the kind of match (URL, fingerprint,
> quote), and the payout. The top-referenced domains panel shows that arxiv,
> github, and wikipedia are the biggest feeders — exactly what you'd expect
> for a research economy."

Type a query like "transformer" in the search box to show the filter.

### 1:30 — Payments (`/dashboard/payments`)

> "Every citation resolves to a payment. The status cards show PENDING,
> SETTLED, FAILED, QUOTED, CAPPED — the full settlement pipeline. The
> numbers come from atomic USDC (10^-6 precision, BigInt-safe throughout)."

Scroll to the table at the bottom. Click an external "View" link to show
the ArcScan URL for any settled payment.

### 2:15 — Creator deep view (`/dashboard/creator/<some-id>`)

> "Now let's follow one creator end-to-end. Click any top earner from the
> /creators page. You see their profile, wallet (verified via EIP-191
> signature), top sources, recent citations, recent payments, and a
> 30-day timeline."

### 3:00 — Protocol (`/dashboard/protocol`)

> "And from the macro view: the settlement rate, attribution scores, and
> 30-day citation volume. The settlement rate is the killer metric for
> investor conversations — it tells you how reliable the system is."

### 3:30 — The flow

> "Let me put it all together. A creator registers a source. An AI agent
> generates a response that cites it. Our citation engine matches the URL
> or the fingerprint, scores the attribution, computes a payout, and the
> payment engine settles it on Arc. Every step is on the dashboard. Every
> step is auditable on ArcScan."

### 4:00 — Q&A

Likely questions:

- **"What does the AI agent run on?"** — `@nanoproof/agent` is a Node.js
  package; it ships as a portable library. See `packages/agent/src/`.
- **"How does attribution scoring work?"** — Today: URL match / fingerprint
  match / quote match (Phase 3). Future: LLM-as-judge (Phase 8).
- **"Why pglite in dev?"** — Same answer as Phase 5 — Termux-native test
  harness. Production runs on real Postgres (Neon / Railway).
- **"What's the cost per citation?"** — Settlement rate is ~60% (Phase 4
  simulation); payments typically $0.001-$0.01 atomic USDC.

## Failure modes and recovery

| Symptom                                  | Fix                                                            |
| ---------------------------------------- | -------------------------------------------------------------- |
| "Demo mode disabled" toast              | Restart api with `NANOPROOF_DEMO_MODE=true`                    |
| Dashboard shows 0 citations              | Click "Load Demo Dataset" — it wipes and re-seeds               |
| Page won't load / 500                    | `pnpm --filter @nanoproof/api test:e2e` to check infra         |
| Charts blank after seed                  | Refresh — Recharts ResizeObserver needs a layout pass          |
| Need to reset between demos              | Click "Load Demo Dataset" again — it's idempotent              |

## Demo script (verbatim, ~3 min)

```
Hi, I'm <name>. NanoProof is the protocol that lets AI agents pay creators
when they cite their work.

[Open /dashboard]

The hero number is here: 1,000 citations, $5.00 settled across 100 creators.
The flow chart underneath is the whole story — Creator registers a
source, AI cites it, we match it, we pay the creator, we settle on chain.

[Open /dashboard/citations]

Every citation is logged with the snippet, the match kind, and the
payout. We can search — say, for "transformer" — and filter in real
time. The top-referenced domains are arxiv, github, wikipedia.

[Open /dashboard/payments]

Each citation becomes a payment. The settlement pipeline shows us
PENDING, SETTLED, FAILED, QUOTED, CAPPED — full visibility. Settled
payments have ArcScan URLs so anyone can audit.

[Click a top earner on /dashboard/creators]

Here's a single creator's view. Profile, wallet, sources, earnings,
30-day timeline. The wallet was verified via EIP-191 signature on Arc.

[Open /dashboard/protocol]

From the macro view: settlement rate, attribution scores, citation volume.
This is the investor story.

[Click "Load Demo Dataset" if you need a fresh start]

One click to reset the demo data — 100 creators, 500 sources, 1000
citations, 1000 payments. Deterministic, reproducible, runs against
local Postgres in seconds.

Questions?
```

## Architecture story (for deeper questions)

- `@nanoproof/agent` is a portable Node.js package that any AI agent
  integrates with. It runs the citation engine (URL/fingerprint matching)
  + attribution scoring + settlement flow.
- The api (NestJS) is the canonical store: creators, sources, citations,
  payments. Append-only on citations + payments (Postgres triggers).
- The web (Next.js 15) is the read view. All charts are server-rendered
  from analytics endpoints; the charts library is Recharts SVG.
- For demos we run pglite (WASM Postgres) — no Docker, no apt postgresql,
  runs on Termux/Android. Production: real Postgres on Neon or Railway.
- The on-chain leg is Circle Gateway + Arc testnet — every settled
  payment has an ArcScan URL.

## Why this matters (for judge Q&A)

> "AI agents don't pay creators today. We built the rails for that.
> The dashboard is the proof — you can see the flow, the totals, the
> audit trail, in five minutes."