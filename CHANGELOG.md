# Changelog

All notable changes to NanoProof Protocol are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-rc.1] — 2026-07-03 — Release Candidate

> **Lepton Hackathon submission** — Canteen × Circle × Arc.
> All 8 phases shipped. x402 payment protocol + Arc settlement proof + ArcScan verification live.

### Added

#### Phase 8 — x402 Payment Protocol + Arc Settlement Proof (the headline feature)

- **x402 middleware** (`apps/api/src/x402/x402.middleware.ts`) — Express middleware returning real `HTTP 402 Payment Required` + `PAYMENT-REQUIRED` header + JSON challenge body. Wired to `/v1/premium/research/answer` route via new `PremiumModule`.
- **x402 challenge generation** — `x402.service.ts:createPaymentRequest()` emits `PaymentRequest` row + `X402PaymentRequired` JSON with `x402Version: 1`, EIP-3009 nonce, validBefore window, CAIP-2 network ID.
- **Settlement lifecycle** — `x402.service.ts:settlePayment()` creates `Payment` + `SettlementProof` rows atomically. Hash-chained per creator: `hash = sha256(prevHash + canonical body)`.
- **ArcScan verification** — `arcscan-verifier.service.ts` calls Blockscout v2 API (`https://testnet.arcscan.app/api/v2/transactions/{txHash}`). 30-second in-memory cache. `SYNTHETIC` source for demo mode.
- **VerificationEvent timeline** — append-only log of every ArcScan check attempt (initial + on-demand re-verifies).
- **Supporter + ProtocolMetrics** aggregates — per-payer totals, protocol-wide counters, real-time dashboard updates.

- **11 REST endpoints** (all public, `@Public()`, no auth required — open-agent-friendly):
  - `POST /x402/demo` — one-click create+authorize+settle+verify
  - `POST /payments/create` — emit x402 challenge
  - `POST /payments/authorize` — accept signed PAYMENT-SIGNATURE
  - `POST /payments/settle` — settle onchain (or simulated in demo)
  - `POST /payments/verify` — re-verify via ArcScan
  - `GET /payments/history` — list recent payments (filterable)
  - `GET /payments/:id` — payment + proof + events
  - `GET /payments/proof/:id` — settlement proof + timeline
  - `GET /creators/:id/revenue` — aggregate revenue stats
  - `GET /metrics` — protocol-wide counters
  - `GET /supporters` — recent supporter wallets

- **Web UI** (`apps/web/`):
  - `/payments` — one-click x402 flow with live protocol metrics + settlement timeline + ArcScan link
  - `/history` — auto-refreshing settlement table (8s) + supporter list
  - `/history/[id]` — proof detail + verification timeline + re-verify button
  - Dashboard Phase 8 strip — 402 challenges, x402 settled, ArcScan verified, unique supporters, last settlement timestamp
  - Components: `PaymentModal`, `SettlementTimeline`, `VerificationBadge`

- **Schema additions** (5 new tables + 2 new enums):
  - `payment_requests` — x402 challenge lifecycle (QUOTED | AUTHORIZED | SETTLED | EXPIRED | FAILED)
  - `settlement_proofs` — immutable, hash-chained per creator (PENDING | VERIFIED | FAILED | INCONCLUSIVE)
  - `verification_events` — append-only ArcScan check log
  - `supporters` — payer wallet aggregates (per-address)
  - `protocol_metrics` — singleton protocol counters

- **Demo mode** (`NANOPROOF_DEMO_MODE=true`):
  - Synthesises Arc-shaped txHashes (sha256 of `nanoproof:tx:<seed>`)
  - Deterministic block numbers in 9.5M–10M range
  - Synthetic verifier responses (`source: "SYNTHETIC"`)
  - Full lifecycle runs in 5–10 seconds end-to-end

- **Documentation**:
  - `docs/PHASE8.md` — overview, schema, decisions
  - `docs/X402_IMPLEMENTATION.md` — x402 protocol deep dive
  - `docs/PAYMENT_FLOW.md` — end-to-end lifecycle with failure modes
  - `docs/ARC_SETTLEMENT.md` — Arc testnet + ArcScan details
  - `docs/API_REFERENCE.md` — complete REST reference
  - `docs/PHASE8_AUDIT.md` — production audit (10 dimensions, 78/100 → 88/100)
  - `docs/READY_FOR_PHASE9.md` — Phase 9 plan
  - `docs/JUDGE_GUIDE.md` — 60-second judge demo walkthrough

- **Tests**: 12 e2e tests covering create/authorize/settle/verify lifecycle, hash chain integrity, error handling. All passing.

- **Migration**: `apps/api/prisma/migrations/20260703000000_phase8_x402_settlement/migration.sql` — full DDL for new environments.

#### Earlier phases (Phases 0-7)

- **Phase 7**: Deployment configs (Railway / Vercel / Neon / Render / Fly.io)
- **Phase 6**: Creator analytics dashboard (12 endpoints, 5 pages, 73 tests)
- **Phase 5**: Lepton demo MVP
- **Phase 4**: Payment Engine (Vault / PaymentIntent / Payout / Receipt models)
- **Phase 3**: Citation Engine (Fingerprint / Citation / Attribution models)
- **Phase 2**: Creator Registry (Creator / Organization / ApiKey / Wallet / SourceVerification models)
- **Phase 0**: MVP scaffolding (NestJS + Prisma + Postgres + Redis + Next.js)

### Changed

- **Production-ready**: hash-chained SettlementProofs, hash chain integrity test, retry-safe idempotency, FK cascades on creator deletion, immutable event log.
- **Demo seed** (`/debug/seed-x402?count=30`) — creates 4 creators + 30 settlements + ArcScan verifications. Used to populate the live demo for judges.

### Security

- **Debug endpoint gate** (`@DebugOnly()` + `DebugOnlyGuard`): all `/debug/*` endpoints require `NANOPROOF_DEBUG_ENDPOINTS=true` env var. Production returns 404.
- **Input validation**: Zod schemas on all POST endpoints (creatorId regex, address regex, amount range, validity window bounds).
- **SQL injection**: Prisma parameterizes all queries; raw SQL uses `$queryRaw` template literals.
- **Replay protection**: EIP-3009 nonce uniqueness (`@@unique` constraint); PaymentRequest status check prevents double-settle.
- **XSS**: React auto-escapes; no `dangerouslySetInnerHTML` in x402 components.

### Performance

- **Page sizes** (gzipped):
  - `/payments` HTML: 3.8 KB
  - `/history` HTML: 2.6 KB
  - Total JS chunks: ~100 KB
- **API latency**:
  - `/metrics`: ~50ms (after fix — was 2s due to upsert-on-read)
  - `/payments/settle`: ~200ms (after removing unnecessary include)
  - One-click demo: ~8 seconds end-to-end (judge experience)

### Known limitations

- Demo mode synthesises Arc-shaped txHashes instead of broadcasting real onchain txs. Production deployments should set `NANOPROOF_DEMO_MODE=false` and configure a facilitator wallet with USDC for gas.
- EIP-712 signature verification is structural (regex + hex validation) only — production needs full ECDSA recovery.
- Railway auto-deploy had intermittent delays during Phase 9 polish (auto-deploy recovered after ~30 minutes).
- BigInt JSON serialization via prototype mutation (`BigInt.prototype.toJSON = ...`) — acceptable for our use but not the cleanest pattern.
- Pre-existing Phase 4 schema files (`schema.citation-engine.prisma`, `schema.payment-engine.prisma`) are not referenced by main schema — Phase 4's models exist in code but their tables don't. Out of scope for Phase 8.

### Verification

- 12 e2e tests passing (`apps/api/test/e2e/x402.e2e.spec.ts`)
- 0 TypeScript errors (`tsc --noEmit` clean)
- 0 ESLint errors
- Live smoke test passes: 8-second end-to-end flow from `POST /x402/demo` to ArcScan URL visible

---

## [0.x.x] — Pre-release (Phases 0-7)

See git history for changes prior to 1.0.0-rc.1.