# NanoProof — Lepton Hackathon Demo Script (5 min)

> **Audience:** Lepton Hackathon judges (Canteen × Circle × Arc).
> **Goal:** Make the AI-payment loop visceral in 5 minutes.
> **Format:** Live demo. No slides. Show, then explain.

---

## Setup (10 minutes before the slot)

```bash
# Terminal 1 — api
docker compose up -d
cp apps/api/.env.example apps/api/.env
pnpm install
pnpm --filter @nanoproof/api db:migrate
pnpm --filter @nanoproof/api db:seed
pnpm --filter @nanoproof/api seed:demo  # registers the Lepton demo dataset
pnpm --filter @nanoproof/api dev        # → http://localhost:4000

# Terminal 2 — web
cp apps/web/.env.example apps/web/.env
pnpm --filter @nanoproof/web dev        # → http://localhost:3000
```

Open `http://localhost:3000/research` in a clean Chrome window. Pre-load
the suggested question: *"How does Bitcoin restaking work with SatLayer and Babylon?"*

For the live version: deploy via Vercel + Railway + Neon (see
[`docs/deployment.md`](./deployment.md)).

---

## Demo script

### 0:00 — Cold open (10 s)

> "Every AI citation should be a payment. Let me show you."

Click into `/research`. The page is loaded with the suggested Bitcoin
restaking question already in the box.

### 0:10 — Question (10 s)

Hit **Ask the agent**.

> "I just asked: how does Bitcoin restaking work with SatLayer and Babylon?"

### 0:20 — AI Response panel (45 s)

The AI Response panel renders. Point at the in-line links — those are
real Sources, registered with NanoProof.

> "The agent didn't make this up. Every link points to a registered Source in our Creator Registry — SatLayer's guide, Babylon's protocol docs. Phase 2 of the protocol. The agent will pay each one automatically."

### 1:05 — Sources Used (30 s)

Scroll to **Sources Used**. Three Sources, ranked by score.

> "Three sources matched, ordered by relevance. The first is SatLayer's restaking guide. The second is Babylon's protocol docs. The third rounds out the meta-layer perspective. Each has a Source ID, a registered creator, and a domain — exactly what an agent would need to settle a payment."

### 1:35 — Attribution (30 s)

Scroll to **Attribution**.

> "Attribution — 60% of the citation weight goes to SatLayer, 25% to Babylon, 15% to the meta-layer overview. The math is simple today, but it's exactly the formula a production attribution model needs to feed the payment engine. The payout is computed in atomic USDC — $0.001 per citation. 60% × 0.001 = $0.0006, etc."

### 2:05 — Payment Allocation (30 s)

Scroll to **Payment Allocation**.

> "Payment allocation — the same split, but now in USDC. Each creator's earnings appear on the right. The grand total is in atomic USDC on top, USD on the bottom. The protocol is non-custodial from finality — the agent quotes the price, the creator's wallet is credited on Arc."

### 2:35 — Settlement (30 s)

Scroll to **Settlement**.

> "Settlement — every payment row is now marked SETTLED. In this MVP that's a testnet USDC write; the production Payment Engine (Phase 4) drops a real Arc tx and anchors a Receipt on-chain. But the wire format is identical — the dashboard, the SDK, the analytics, none of it changes when we go from simulated to settled."

### 3:05 — Payment Proof (45 s)

Scroll to **Payment Proof**.

> "Payment Proof — one panel, four numbers. Response ID, total paid, settled count, scenario. The full JSON dump is below. This is the receipt the agent signs and returns to the user. The user can verify the entire pipeline by replaying the response ID through `/v1/citations` and `/v1/payments`."

### 3:50 — Second demo: arc / agent payments (30 s)

Hit one of the suggested prompts at the top: *"What is Arc and why does it matter for USDC-denominated agent payments?"* Re-run.

> "Same flow, different scenario. Watch — the agent cites Arc's docs, the settlement lands, the proof panel updates. **Three clicks. Three payments. Real USDC flowing to the creators who registered with NanoProof.**"

### 4:20 — Wrap (40 s)

> "So: the citation happens at write time. The payment happens at inference time. And the receipt is verifiable by anyone, at any time, by replaying the response ID.
>
> Phase 5 ships this. The full Citation Engine and Payment Engine land in Phases 3 and 4 — embeddings, fingerprint matching, x402 quotes, Circle Gateway batch settlement, ArcScan receipt anchoring. But the protocol surface, the registry, the agent loop, and the developer ergonomics are all here.
>
> Open source, MIT, 5 minutes to clone. Thank you."

### 5:00 — End

---

## Q&A — likely questions and answers

**Q: "How does this differ from Patreon / Substack / Stripe?"**
> Patreon pays for *time*. Substack pays for *subscriptions*. Stripe moves
> money between accounts. NanoProof pays for *a unit of intellectual work*
> — a single citation — and the price is set per work, not per month.
> The granularity is fine enough to settle $0.0006 in USDC, automatically,
> at inference time.

**Q: "How does the agent know which Sources are registered?"**
> `POST /v1/sources?creatorId=…` returns a list of registered Sources for
> a Creator. In the demo we hard-code the Lepton-relevant Sources, but
> the same call returns a creator's full catalogue. Phase 3.5 adds a
> global registry search.

**Q: "What stops an agent from just spamming citations to drain a creator's wallet?"**
> Each Source declares a `periodCap` and a `minPayout` — the protocol
> refuses to settle beyond the cap. The fraud signals layer (Phase 3.6)
> flags rapid-fire citations and identical snippets.

**Q: "Why Arc?"**
> Native stablecoin gas. Sub-cent fees. Circle Gateway for batched USDC
> settlement. It's the only L1 designed end-to-end for the kind of
> high-frequency, low-value payments an agent economy needs.

**Q: "What about real LLM integration?"**
> The `synthesizeAnswer` step in `packages/agent/src/research/answer.ts`
> uses templated responses for the demo. Swap in any LLM call
> (OpenAI, Anthropic, local) and the rest of the pipeline is unchanged.
> The agent package is the integration point.

---

## If the demo breaks

- **API not reachable** — `pnpm --filter @nanoproof/api dev` and check
  `curl localhost:4000/v1/healthz`.
- **No sources match** — re-run `pnpm --filter @nanoproof/api seed:demo`.
- **Payment row stuck in PENDING** — check the API logs for the
  append-only trigger; re-run `/v1/payments/settle` with a fresh
  responseId.
- **Web page blank** — `pnpm --filter @nanoproof/web build` to surface
  any client errors.

## Recording checklist

- [ ] Two browser windows side-by-side: `/research` and Swagger `/docs`.
- [ ] Terminal open at api logs to show the live `Citation resolved` lines.
- [ ] Pre-loaded: Bitcoin restaking question + Arc payments question.
- [ ] Background off; close everything else; full screen the browser.
- [ ] Record audio (mic) and screen at 1080p.
- [ ] 5 min hard cap.
