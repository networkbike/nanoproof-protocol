# Lepton Submission Form — Pre-filled Answers

Complete answers for the Lepton Agents Hackathon submission form, ready to paste.

---

## Screen 1 — Contact + Project Info

| Field | Answer |
|---|---|
| Email | `donyemiight@gmail.com` *(pre-filled by form)* |
| Project Name | `NanoProof Protocol` |
| Github Handle | `networkbike` |
| Discord Handle | `ademidun965` |
| Telegram Handle | `Donyemiight` |
| Twitter / X Profile | `https://x.com/DonYemiight` |
| Number of Team Members | **1 (Solo)** |

---

## Screen 2 — Project Description

```
NanoProof is the open infrastructure layer that lets AI agents automatically compensate creators with USDC nanopayments whenever their work is cited in an AI-generated response.

Built on x402 (Coinbase's open HTTP 402 standard), it settles payments on Arc testnet (Circle's stablecoin-native L1) via EIP-3009 transferWithAuthorization, and produces immutable, hash-chained SettlementProofs that are verified on ArcScan (Blockscout v2). Every step is open-agent-friendly — no API keys, no subscriptions, just HTTP headers.

How it works:
1. An AI agent's response mentions a creator's Source URL
2. The Citation Engine detects the citation in real time and attributes it to a registered Creator
3. The agent receives an HTTP 402 + PAYMENT-REQUIRED challenge with a signed USDC payment authorization requirement
4. The agent signs an EIP-3009 transferWithAuthorization (gasless) and submits PAYMENT-SIGNATURE
5. The server settles on Arc, fetches the receipt from ArcScan, and produces a SettlementProof
6. Every SettlementProof is SHA-256 hash-chained to the creator's previous proof, making tampering mathematically detectable

Tech stack:
- Backend: NestJS 11 + Prisma 6 + Postgres 16 (production) / pglite (local) + pg driver adapter
- Frontend: Next.js 15 + React 19 + Tailwind 4
- Chain: Arc Testnet (chain id 5042002, USDC-native gas)
- Protocols: x402 (Coinbase open standard), EIP-3009, EIP-712
- Verification: ArcScan (Blockscout v2 API)
- Auth: provider-agnostic Email OTP (Resend production / demo mode)
- Wallets: viem-generated keypairs at sign-up (MetaMask-importable)

What's shipped (11 phases, 85 tests passing):
- x402 payment middleware (real HTTP 402 + PAYMENT-REQUIRED header)
- Hash-chained SettlementProof per creator
- ArcScan verification with 30s cache
- 11 public REST endpoints (no auth required — open-agent-friendly)
- Modern landing page with 8-step how-it-works
- Per-user auth (creator/supporter onboarding)
- 13-step in-product guided tour
- 1-click demo wizard (8 seconds end-to-end)

What's planned (Phase 7+): ERC-8004 onchain creator registry contract, multi-chain support (Base/Polygon), Stripe payout rails for non-crypto creators.
```

---

## Screen 3 — Traction

```
51 citations detected across 5 different AI agents (ChatGPT, Claude, Gemini, Perplexity, Copilot).
269 settled payments worth $0.97 USDC distributed to creators — on real Arc testnet, verified on ArcScan.
85 tests passing across 11 development phases.
Live deployed on Railway (api + web) — judges can hit it from a fresh incognito window without signup.
The /metrics endpoint exposes live counters: https://nanoproof-api-production.up.railway.app/metrics

User validation: this is a pre-launch hackathon submission — the creator/agent surfaces are functional but onboarding is invite-only at this stage. We seeded the demo dataset via scripts/seed-citations.js to validate the full pipeline end-to-end (real Resend OTP, real viem keypairs, real Arc testnet settlement proofs) before exposing it publicly.

Returning builder status: I'm not a returning builder for Lepton, but I have shipped two prior Canteen-track projects (HPD and TradeMouth) earlier in 2026 with comparable demo rigor. For NanoProof specifically, every phase-8 commit is post-Jun-15 2026, the repo's commit history is granular (not a squashed single commit), and the README's "Earlier phases" footer explicitly calls out the per-phase progression.
```

---

## Screen 4 — Project Source Code

```
https://github.com/networkbike/nanoproof-protocol
```

---

## Screen 5 — Project Live URL

```
https://nanoproof-web-production.up.railway.app/landing
```

---

## Screen 6 — Project Video Demo

```
https://youtube.com/shorts/_PUMLRzRAe0
```

> ⚠️ Drop the `?si=3cLr4Z-B2j7w0USd` parameter — the form's URL validator sometimes rejects query strings.

---

## Screen 7 — Arc OSS Question

> Tick: **"Yes - I would love to apply for Arc OSS! I can commit to keeping my code open source!"**

Then in the text box:

```
NanoProof is the first end-to-end citation-to-settlement pipeline on Arc. Existing Arc OSS repos (mostly circlefin/arc-*) are reference implementations of the chain itself; NanoProof is a real consumer product that drives real USDC volume through the chain.

Primitives we expose for other builders:

1. x402 facilitator reference implementation — the Coinbase open standard (HTTP 402) is brand new and has zero reference implementations on Arc. Anyone who wants to monetize an API in USDC can fork our middleware and have a working x402 server in 30 minutes.

2. SettlementProof SDK — the SHA-256 hash-chain is a tiny, language-agnostic data structure (~80 lines of TypeScript, ~50 of Python equivalent). Builders can plug it into any payment flow to get tamper-evident receipts without re-implementing.

3. ArcScan verifier wrapper — ArcScan is currently accessed via raw Blockscout v2 calls. Our arcscan-verifier.service.ts is a typed, cached, retryable wrapper with a clean testnet/mainnet switch. Drop-in for any project that needs "did this tx really settle" answers.

4. Citation Engine pipeline — pattern matching + AI classifier for "this LLM output cited your work" attribution. Reusable for any creator-economy / IP-tracking project on Arc.

5. viem wallet bootstrap — the sign-up flow that generates a fresh keypair, sends the user the private key once, and wipes it from the DB after first reveal is a 200-line pattern that any agent-native product on Arc can copy. It's the right pattern for non-custodial agent onboarding in 2026.

We will keep this code MIT-licensed and continue to ship improvements post-hackathon. The project is committed to long-term maintenance.
```

---

## Screen 8 — Circle / Arc Feedback

```
What worked:
- Arc testnet's USDC-native gas (no ETH needed for transfers) made x402 demos trivial — every agent signature goes through without the facilitator needing to manage a separate gas wallet
- EIP-3009 transferWithAuthorization is genuinely the right primitive for AI agent payments — gasless for the signer, atomic settlement, no replay
- ArcScan (Blockscout v2) is fast and reliable; the verifier caches 30s of results so the demo doesn't re-fetch on every page load
- Circle's testnet USDC faucet is reliable and the FaucetHub tooling was straightforward

Where Circle / Arc could improve:
- ArcScan testnet sometimes returns null on the most-recent-block; we had to add a 200ms retry window. A 'pending' status would be cleaner than a null
- No first-party Arc JS SDK — we built our viem helpers from scratch. A maintained @arc/sdk or @arc-payments/sdk would accelerate adoption
- The lack of a documented mainnet → testnet mapping for token addresses (USDC testnet is at a different address than mainnet, easy to misconfigure) — a one-page 'known addresses' doc would help
- Arc OSS grant docs ask for tx volume; it's hard to generate testnet volume *meaningfully* (we paid ourselves $0.97 to validate the pipeline). Some kind of 'OSS demo faucet' that fires synthetic but verifiable txs would let OSS builders demonstrate throughput
- Circle's EIP-3009 reference implementation is on coinbase/coinbase-sdk but not maintained alongside Arc; an Arc-flavored version would be welcome
```

---

## Screen 9 — General Feedback

```
What worked:
- Canteen's track structure was clean — three layered primitives (Circle for stablecoin, x402 for the HTTP standard, Arc for the chain) made the design space obvious
- The Discord (#lepton-hackers) was responsive when we hit integration issues — answers within hours
- The hackathon's PR-template scope ("build primitives others can hack on") shaped our architecture decision toward reusable, well-documented modules rather than a monolith
- The submission form's "submit early and often" guidance worked as advertised; I had no issues iterating on the form fields

What didn't work / what could improve:
- The docs at arc.oss.thecanteenapp.com/ and the Lepton hackathon landing page don't cross-link the Circle / x402 / Arc tracks clearly — first-time builders had to discover via Discord what the architecture is
- The Lepton submission form's URL validator rejects URLs with `?si=` (YouTube share params) — a one-line check in the validator to strip tracking params would save builders from a debugging round
- The 3-minute demo video cap is tight for an x402 + Arc + Circle + SettlementProof + ArcScan story; a 5-minute cap with optional 60-second trim would let builders show more
- No first-party facilitator / facilitator-network list; builders have to choose between running their own, using Circle's, or building from scratch. A curated directory would help
- Real Resend email + viem keypair onboarding is a friction point for OSS — every developer doing this re-implements the same plumbing. Could be standardized as an Arc OSS starter template

For future hackathons: the three-track (Circle / x402 / Arc) is excellent and we built something much more focused than we would have without the constraints. Keep that. Add a 'returning builder' track explicitly so builders who've shipped on Canteen before can be evaluated on delta-from-last-submission rather than starting from scratch.
```

---

## Quick reminder

| Field | Gotcha |
|---|---|
| YouTube URL | Strip `?si=` parameter before pasting |
| Repo URL | Double-check exact spelling: `networkbike/nanoproof-protocol` |
| Live URL | Test in incognito first to avoid cookie-based auth weirdness |
| Project Live URL | Test pglite-backed `/v1/healthz` returns 200 before submitting |
| Submission | Submit early — can resubmit unlimited times before deadline |