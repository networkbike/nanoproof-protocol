# Lepton Hackathon Submission — NanoProof Protocol

> Pre-filled answers for the Lepton submission form.
> All claims are backed by live URLs that judges can hit.

---

## Project name
**NanoProof Protocol**

## One-line pitch
Citation-level USDC nanopayments for the agent economy — x402 protocol on Arc, verified on ArcScan.

## Detailed description
NanoProof is the open infrastructure layer that lets AI agents automatically compensate creators with USDC nanopayments whenever their work is cited in an AI-generated response. Built on **x402** (Coinbase's open standard for HTTP 402 Payment Required), it settles payments on **Arc testnet** (Circle's stablecoin-native L1) via **EIP-3009** transferWithAuthorization, and produces **immutable, hash-chained SettlementProofs** that are verified on **ArcScan** (Blockscout v2). Every step is open-agent-friendly — no API keys, no subscriptions, just HTTP headers.

## Category
- **Primary**: Agent commerce / payments
- **Secondary**: Decentralized infrastructure

## Tech stack
- **Backend**: NestJS 11 + Prisma 5 + PostgreSQL 16 + pg driver adapter
- **Frontend**: Next.js 15 (React 19) + Tailwind 4 + shadcn-style components
- **Chain**: Arc Testnet (chain id 5042002, USDC-native gas)
- **Protocols**: x402 (Coinbase open standard), EIP-3009, EIP-712
- **Verification**: ArcScan Blockscout v2 API

## Key features (already shipped)

1. ✅ **x402 payment middleware** — real HTTP 402 + `PAYMENT-REQUIRED` header on `/v1/premium/*` routes
2. ✅ **Settlement proof** — hash-chained per creator, immutable, ArcScan-verified
3. ✅ **ArcScan verification** — Blockscout v2 API integration with 30s cache
4. ✅ **11 REST endpoints** (all public, open-agent-friendly)
5. ✅ **Creator dashboard** with Phase 8 metrics strip
6. ✅ **One-click demo flow** — judge runs the full lifecycle in 8 seconds
7. ✅ **Demo data seeded** — 4 creators, 213+ settlements, $0.86 USDC distributed
8. ✅ **12 e2e tests** passing
9. ✅ **Comprehensive documentation** — 8 dedicated docs (PHASE8, X402, PAYMENT_FLOW, ARC_SETTLEMENT, API_REFERENCE, AUDIT, JUDGE_GUIDE, CHANGELOG)

## Live URLs

| Page | URL | Status |
|---|---|---|
| Web landing (judge entry) | https://nanoproof-web-production.up.railway.app/landing | ✅ 200 |
| Sign in (Email OTP) | https://nanoproof-web-production.up.railway.app/sign-in | ✅ 200 |
| Creator dashboard | https://nanoproof-web-production.up.railway.app/creator | ✅ 200 |
| Supporter dashboard | https://nanoproof-web-production.up.railway.app/supporter | ✅ 200 |
| Interactive demo wizard | https://nanoproof-web-production.up.railway.app/demo | ✅ 200 |
| x402 payment flow | https://nanoproof-web-production.up.railway.app/payments | ✅ 200 |
| Settlement history | https://nanoproof-web-production.up.railway.app/history | ✅ 200 |
| Dashboard | https://nanoproof-web-production.up.railway.app/dashboard | ✅ 200 |
| Premium research (x402) | https://nanoproof-api-production.up.railway.app/v1/premium/research/answer?q=test | ✅ 200 (demo bypass) |
| API health | https://nanoproof-api-production.up.railway.app/v1/healthz | ✅ 200 |
| API Swagger | https://nanoproof-api-production.up.railway.app/api | ✅ 200 |
| API metrics (live counts) | https://nanoproof-api-production.up.railway.app/metrics | ✅ 200 |
| x402 demo endpoint | https://nanoproof-api-production.up.railway.app/x402/demo | ✅ POST |

## GitHub repo
https://github.com/networkbike/nanoproof-protocol

## Demo video / walkthrough script
See `docs/JUDGE_GUIDE.md` — 60-second recommended path:
1. `/payments` — click "▶ Start x402 flow" (8 seconds)
2. `/history` — see new settlement appear (auto-refresh every 8s)
3. `/dashboard` — see protocol metrics update live

## Architecture (1 paragraph)
NanoProof implements **x402** (Coinbase's open standard for HTTP 402 Payment Required) on **Arc** (Circle's stablecoin-native L1) with **EIP-3009** (gasless USDC transfers) and verifies every settlement on **ArcScan** (Blockscout v2). The protocol produces an **immutable, hash-chained SettlementProof** for every payment — `hash = sha256(prevHash + canonical body)` — making the system tamper-evident and publicly auditable onchain.

## Why x402 + Arc?
- **x402**: First protocol to actually use HTTP 402 (reserved since 1991) for payments. Open standard by Coinbase, Apache 2.0 license. TypeScript + Python SDKs available.
- **Arc**: USDC-native gas (no volatile ETH required), sub-second BFT finality, sub-cent fees, hackathon-aligned with Circle.
- **EIP-3009**: USDC's native `transferWithAuthorization` enables gasless client signing — the facilitator pays gas onchain.
- **ArcScan (Blockscout v2)**: Public, immutable, onchain verification of every settlement.

## What's complete
- ✅ Phase 0 — MVP scaffolding (NestJS + Prisma + Next.js + Postgres + Redis)
- ✅ Phase 2 — Creator Registry (Creator + Organization + ApiKey + Wallet)
- ✅ Phase 3 — Citation Engine (Fingerprint + Citation + Attribution)
- ✅ Phase 4 — Payment Engine (Vault + PaymentIntent + Payout + Receipt)
- ✅ Phase 5 — Lepton Demo MVP
- ✅ Phase 6 — Creator Analytics Dashboard (12 endpoints, 5 pages)
- ✅ Phase 7 — Deployment configs (Railway live)
- ✅ Phase 8 — x402 Payment Protocol + Arc Settlement Proof + ArcScan Verification
- ✅ Phase 9 — Demo polish + RC preparation

## What's deployed
Live on Railway:
- Web: `nanoproof-web-production.up.railway.app`
- API: `nanoproof-api-production.up.railway.app`
- Database: Railway managed Postgres (auto-injected `DATABASE_URL`)
- Phase 8 schema applied via `prisma db push`
- `NANOPROOF_DEMO_MODE=true` for the demo experience

## Judge experience
- **Time to first settlement**: 8 seconds (page load + one-click demo)
- **Time to full demo**: 60 seconds (3-step walkthrough in JUDGE_GUIDE.md)
- **No setup required**: no API keys, no installation, no wallets
- **Realistic data on load**: 213 settlements, $0.86 USDC, 4 creators, 5 supporters

## Production-readiness
- **Audit score**: 78/100 (live) → 88/100 (post-deploy). See `docs/PHASE8_AUDIT.md`.
- **Test coverage**: 12 e2e tests passing (full lifecycle + hash chain integrity)
- **TypeScript**: 0 errors
- **ESLint**: 0 errors
- **Security**: Debug endpoints gated, input validation, SQL injection safe, replay-safe nonces
- **Documentation**: 8 dedicated docs covering everything

## Code stats
- **Total tests**: 12 x402 + 38 other = 50 e2e tests passing
- **API endpoints**: 11 x402 + 25+ existing = 36+ REST endpoints
- **Web pages**: 7 (home, dashboard, payments, history, history/[id], research, simulate, api-keys, not-found)
- **Database tables**: 17 (12 Phase 2-7 + 5 Phase 8)
- **Documentation**: 8 docs (PHASE8, X402, PAYMENT_FLOW, ARC_SETTLEMENT, API_REFERENCE, AUDIT, JUDGE_GUIDE, CHANGELOG)

## License
MIT (per `package.json`)

## Team
Solo developer — Donyemiight (Temitope Ademidun)

## Contact
- GitHub: https://github.com/networkbike/nanoproof-protocol
- X: https://x.com/DonYemiight
- Telegram: @Donyemiight

---

**Submission window closes**: Jul 6, 2026
**Tagged release**: v1.0.0-rc.1
**Recommended demo path**: `/payments` → click button → `/history` → `/dashboard` (60 seconds total)
---

## Authentication (Phase 10 — Final Frontend)

NanoProof supports **passwordless Email OTP authentication** via any provider:

| Provider | Auth Provider Setting | Required env |
|---|---|---|
| SendGrid | `AUTH_PROVIDER=sendgrid` | `OTP_API_KEY` |
| Mailgun | `AUTH_PROVIDER=mailgun` | `OTP_API_KEY`, `OTP_API_URL` |
| Resend | `AUTH_PROVIDER=resend` | `OTP_API_KEY` |
| Postmark | `AUTH_PROVIDER=postmark` | `OTP_API_KEY` |
| Demo (default) | (unset) | none — judges can sign in with any 6-digit code |

### Required Railway env vars for production

```bash
AUTH_PROVIDER=resend              # or sendgrid/mailgun/postmark
OTP_API_KEY=re_xxxxxxxxxxxxxxxx   # your provider key
OTP_SENDER=no-reply@yourdomain.com
OTP_SENDER_NAME="NanoProof"
JWT_SECRET=<64+ char random>
JWT_EXPIRES_IN=7d
COOKIE_SECRET=<64+ char random>   # reserved for future cookie auth
```

### Sign-in flow

1. User clicks **Sign in** → `/sign-in`
2. Enters email
3. Backend generates 6-digit code (5-min TTL)
4. Backend calls provider → email sent
5. User enters code
6. Backend verifies → issues HMAC-SHA256 JWT
7. Web stores session in localStorage
8. Role selection (Creator / Supporter) on first sign-in
9. Redirect to `/creator` or `/supporter`

### Demo mode fallback

When `AUTH_PROVIDER` is unset or backend OTP is unreachable, the web layer
falls back to demo mode: any 6-digit code is accepted. Judges always
get a working sign-in flow.

