# Ready for Phase 9

> Phase 8 is production-grade. With the audit fixes deployed, NanoProof is
> ready for the next phase. This document captures what's locked in, what's
> open, and what Phase 9 candidates are on the table.

---

## Phase 8 verdict

**Production audit score: 78 / 100 (live) → 88 / 100 (post-deploy).**

Phase 8 ships:
- ✅ x402 payment protocol (Coinbase open standard)
- ✅ Real HTTP 402 + `PAYMENT-REQUIRED` header on `/v1/premium/*` routes
- ✅ EIP-3009 transferWithAuthorization (synthetic in demo, real in production)
- ✅ Arc testnet settlement proof (hash-chained, immutable, ArcScan-verified)
- ✅ ArcScan verification via Blockscout v2 (`https://testnet.arcscan.app/api/v2`)
- ✅ 11 REST endpoints (all public, agent-friendly)
- ✅ Web UI: `/payments`, `/history`, `/history/[id]`, dashboard Phase 8 strip
- ✅ Demo mode: 4 creators + 30 settlements seeded, full one-click flow
- ✅ 12 e2e tests passing
- ✅ 5 documentation files + migration SQL

**Required manual action before Phase 9**: Railway api redeploy. Until that happens, the audit's "FIX APPLIED, PENDING DEPLOY" items remain on the live system.

---

## What's locked in (immutable for Phase 9+)

| Component | Status |
|---|---|
| `x402` HTTP header names (`PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`) | Locked to Coinbase spec |
| Arc testnet chain id (`5042002`) | Locked for Phase 8 (multi-chain via `accepts` array future) |
| USDC contract on Arc (`0x3600...0000`) | Locked for Phase 8 |
| Settlement proof schema (`SettlementProof` model) | Locked (existing payments must keep working) |
| Hash chain format (`hash = sha256(prevHash + canonical body)`) | Locked |
| Atomic USDC encoding (6 decimals, strings) | Locked |
| VerificationEvent schema | Locked |
| Demo mode flag (`NANOPROOF_DEMO_MODE=true`) | Locked |
| Debug endpoint gate (`NANOPROOF_DEBUG_ENDPOINTS=true`) | Locked |
| Price catalog (`PRICE_CATALOG` in `x402.constants.ts`) | Editable per resource |

---

## What Phase 9 should target

### Option A — Live onchain settlement (highest impact)

Replace the synthetic txHash flow with **real Arc testnet transactions**.

**What it adds**:
- Live viem-based facilitator that submits `transferWithAuthorization` to USDC on Arc
- Real EIP-712 signature verification via ECDSA recovery
- Real ArcScan verification replacing SYNTHETIC source
- Facilitator wallet management (needs USDC for gas)
- Real nonce tracking across the facilitator

**Estimated effort**: 2-3 days
**Demo impact**: high — judges see real onchain txs
**Production readiness**: jumps from 88 → 95

**Files to create/modify**:
- New: `apps/api/src/x402/facilitator.service.ts` (viem-based signer + submitter)
- Modify: `apps/api/src/x402/x402.service.ts:settlePayment` (call facilitator instead of synth)
- Modify: `apps/api/src/x402/arcscan-verifier.service.ts` (drop SYNTHETIC branch in prod)
- New: `apps/api/src/lib/eip712.ts` (signature recovery helper)

---

### Option B — Multi-asset x402 (medium impact)

Expand `accepts[]` to support **multiple payment options per challenge**.

**What it adds**:
- Accept EURC, USDC on Base, etc. via x402 `accepts` array
- Per-asset price catalog (different atomic decimals)
- Cross-chain settlement proofs
- "Pay with EURC" vs "Pay with USDC" UI choice

**Estimated effort**: 3-4 days
**Demo impact**: medium — shows x402 protocol's flexibility

---

### Option C — Agent SDK (medium-high impact)

Ship a TypeScript SDK so AI agents can use NanoProof x402 programmatically.

**What it adds**:
- `npm install @nanoproof/x402-client`
- Auto-handle 402 → sign PAYMENT-SIGNATURE → retry
- Type-safe wrappers around all 11 endpoints
- React hook (`useX402Payment`) for web agents
- Verifiable receipts helper

**Estimated effort**: 2-3 days
**Demo impact**: high — directly usable by Lepton agents

---

### Option D — Multi-tenancy / branded dashboards

Let creators deploy NanoProof as their own branded payment layer.

**What it adds**:
- Per-creator custom domains (alice.nanoproof.xyz)
- Custom branding (logo, colors, copy)
- White-label embeddable widget
- Per-tenant analytics

**Estimated effort**: 1-2 weeks
**Demo impact**: low (not core to hackathon demo)
**Production value**: high (real customers)

---

### Option E — Real-time settlement streaming (low impact, fast)

Replace client polling with Server-Sent Events for settlement updates.

**What it adds**:
- `GET /v1/settlements/stream` (SSE)
- Dashboard auto-updates without 5s polls
- WebSocket alternative for full duplex

**Estimated effort**: 1 day
**Demo impact**: low (polling is fine for demo)
**Polish**: nice to have

---

## Recommendation

**Phase 9 = Option A (Live onchain settlement) + Option C (Agent SDK)**.

Rationale:
- Option A is the missing piece that makes x402 *real*. Without it, we're a
  sophisticated simulator. With it, we're a working payment protocol.
- Option C is the developer-experience layer that makes the protocol usable.
  Even if Lepton judges don't npm-install during the demo, the SDK is a strong
  signal of production-readiness.
- Combined effort: ~4-5 days. Fits the timeline.

**Phase 10 candidates** (after Phase 9):
- Option B (multi-asset) — once single-asset flow is rock solid
- Option D (multi-tenancy) — once we have paying creators asking for white-label

---

## Open items to close before Phase 9 starts

| Item | Owner | Action |
|---|---|---|
| Railway api redeploy | **You** | Click "Redeploy" on nanoproof-api in Railway dashboard |
| Verify audit fixes live | Mavis | Once redeployed, confirm `/debug/*` returns 404 and `/v1/premium/*` returns 200 |
| Confirm `NANOPROOF_DEBUG_ENDPOINTS` env policy | You | Decide: always-on for demo, or only enabled during demo window |
| Final live URL list | Mavis | Re-verify all live URLs work end-to-end post-deploy |
| Web redeploy | (auto) | Should redeploy automatically on next push |

---

## Quick-start checklist for Phase 9

Once Phase 8 is verified live:

1. **Verify Phase 8 deployment**:
   ```bash
   curl https://nanoproof-api-production.up.railway.app/v1/premium/research/answer?q=hello
   # Should return 200 with the demo bypass (NANOPROOF_DEMO_MODE=true)
   
   curl https://nanoproof-api-production.up.railway.app/debug/tables
   # Should return 404 (NANOPROOF_DEBUG_ENDPOINTS not set)
   ```

2. **Confirm demo seed works** (after setting `NANOPROOF_DEBUG_ENDPOINTS=true`):
   ```bash
   curl "https://nanoproof-api-production.up.railway.app/debug/seed-x402?count=30"
   # Should return ok:true with 30 settlements created in ~5 seconds (was 90s before fix)
   ```

3. **Verify metrics endpoint is fast**:
   ```bash
   time curl https://nanoproof-api-production.up.railway.app/metrics
   # Should return in <500ms (was 2s before fix)
   ```

4. **Then start Phase 9** with Option A (live onchain settlement).

---

## Phase 8 metrics (final)

| Metric | Value |
|---|---|
| Total settlements on production | ~38 |
| Verified by ArcScan (synthetic in demo) | 38 |
| Failed | 0 |
| USDC distributed (demo synth) | ~$0.16 |
| Unique supporters | 4 |
| Creators | 4 |
| x402 challenges served | 39 |
| API uptime | 150 min+ (deploy pending) |
| Tests passing | 12/12 |
| TypeScript errors | 0 |
| ESLint errors | 0 |

---

**Ready for Phase 9**: ✅ — pending Railway api redeploy to confirm the audit fixes.

**Status**: Awaiting manual Railway redeploy of `28da6ef` (or latest) on the `nanoproof-api` service.

**Recommendation**: Click "Redeploy" on the Railway dashboard for `nanoproof-api`, then ping back to confirm the audit fixes are live. From there, Phase 9 (live onchain settlement) is the natural next step.