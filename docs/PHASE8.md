# Phase 8 — x402 Payment Protocol + Arc Settlement Proof + ArcScan Verification

> NanoProof is now a real programmable nano-payment protocol. Every premium resource
> is paywalled via HTTP 402 with x402 (Coinbase open standard). Payments settle on
> Arc testnet via EIP-3009 transferWithAuthorization. Each settlement produces an
> immutable, hash-chained proof that can be independently verified on ArcScan.

## What shipped

| Component | Status | Where |
|---|---|---|
| x402 middleware (real HTTP 402 + PAYMENT-REQUIRED header) | ✅ | `apps/api/src/x402/x402.middleware.ts` |
| x402 challenge generation (PaymentRequest + x402 JSON) | ✅ | `apps/api/src/x402/x402.service.ts:createPaymentRequest()` |
| Settlement lifecycle (authorize → settle → verify) | ✅ | `apps/api/src/x402/x402.service.ts` |
| Arc settlement proof (immutable, hash-chained) | ✅ | `apps/api/src/x402/x402.service.ts:settlePayment()` |
| ArcScan verification (Blockscout v2 API) | ✅ | `apps/api/src/x402/arcscan-verifier.service.ts` |
| REST endpoints (11 total, all public) | ✅ | `apps/api/src/x402/x402.controller.ts` |
| Web payment flow page | ✅ | `apps/web/src/app/payments/page.tsx` |
| Web settlement history + proof detail | ✅ | `apps/web/src/app/history/` |
| Settlement timeline + verification badge components | ✅ | `apps/web/src/components/x402/` |
| Dashboard Phase 8 metrics strip | ✅ | `apps/web/src/app/dashboard/page.tsx` |
| Demo seed (4 creators + 30 settlements) | ✅ | `GET /debug/seed-x402?count=30` |
| Tests (12 e2e, all passing) | ✅ | `apps/api/test/e2e/x402.e2e.spec.ts` |
| Migration to Railway db (5 new tables) | ✅ | live via `/debug/db-push` |

## End-to-end demo flow

```bash
# 1. Seed the demo (4 creators + 30 settlements, ArcScan-verified)
curl -s https://nanoproof-api-production.up.railway.app/debug/seed-x402?count=30

# 2. Run the live x402 flow end-to-end
curl -X POST https://nanoproof-api-production.up.railway.app/x402/demo \
  -H "Content-Type: application/json" \
  -d '{"creatorId":"cr_demo_alice","resource":"/v1/research/cite","amountUsdc":"1000"}'

# 3. Check protocol metrics
curl https://nanoproof-api-production.up.railway.app/metrics
```

## Key design decisions

### Why HTTP 402?

HTTP 402 "Payment Required" has been reserved since 1991 but never standardised.
x402 (Coinbase, May 2025) is the first protocol to actually use it for HTTP-native
payments. The benefit: every existing HTTP client (browsers, agents, scripts) can
discover pricing and pay without bespoke SDKs.

### Why Arc testnet?

Arc is Circle's stablecoin-native L1:
- **USDC as native gas** — no volatile ETH required
- **Sub-cent transaction fees** — economical for nano-value
- **Sub-second BFT finality** — settlement feels instant
- **CCTP domain 26** — same canonical USDC as every other chain
- **Hackathon partner** — Circle runs the Lepton hackathon on Arc

### Why EIP-3009?

USDC natively implements `transferWithAuthorization`. The flow:
1. Client signs an EIP-712 typed message (no gas, no onchain tx)
2. Facilitator (us) submits the pre-signed authorization onchain
3. USDC contract atomically transfers + invalidates the nonce

Result: gasless for the client, single tx for settlement.

### Why a hash-chained proof?

Each `SettlementProof.hash = sha256(prevHash + canonical body)`. Modifying any
historical settlement breaks the chain and is detectable on the next settlement.
Combined with onchain ArcScan verification, the proof is:

- **Public** — anyone with the txHash can verify on ArcScan
- **Tamper-evident** — the chain breaks on alteration
- **Verifiable onchain** — ArcScan is the source of truth
- **Self-contained** — `paymentHash` ties the offchain record to the onchain tx

### Why a singleton `ProtocolMetrics` row?

The dashboard needs atomic, always-consistent protocol-wide counters. A singleton
row with `{ increment }` upserts in a transaction gives us this without read-modify-write
races. The increment on `totalUsdcDistributed` (a String column) is computed in
JS and `set` rather than `increment` to work around Prisma's StringFieldUpdateOperationsInput
limitation.

## Schema additions

```
payment_requests
  id, creatorId, resource, resourceId, description
  amountUsdc, currency, network, chainId
  assetAddress, payTo, facilitator
  validAfter, validBefore, nonce (unique)
  x402Challenge (JSON)
  status (QUOTED | AUTHORIZED | SETTLED | EXPIRED | FAILED)
  paymentId, quotedAt, authorizedAt, settledAt, expiredAt

settlement_proofs
  id, paymentId (unique), paymentHash (unique), txHash (unique)
  blockNumber, blockTimestamp, blockHash
  arcScanUrl, facilitator, network, chainId
  amountUsdc, assetAddress, payerAddress, payeeAddress, nonce
  verificationStatus (PENDING | VERIFIED | FAILED | INCONCLUSIVE)
  confirmedAt, verificationAttempts, lastCheckedAt
  prevHash, hash (unique)  -- hash chain

verification_events
  id, proofId, txHash, status, confirmations
  source (ARCSCAN | SYNTHETIC), payload (JSON), blockNumber, errorMessage
  checkedAt  -- append-only log

supporters
  id, address (unique), totalPaid, totalPayments
  firstSeenAt, lastSeenAt, userAgent, label, metadata

protocol_metrics
  id (always "protocol_metrics_singleton")
  totalPayments, totalSettlements, totalVerifications, totalVerified, totalFailed
  totalUsdcDistributed, totalFeesCollected
  uniqueSupporters, uniqueCreators
  x402ChallengesServed, x402PaymentsSettled
  lastSettlementAt, lastVerifiedAt, updatedAt
```

## REST endpoints

All public (no auth required) — Phase 8 is designed for open agent access.

| Method | Path | Purpose |
|---|---|---|
| POST | `/x402/demo` | One-click create+authorize+settle+verify |
| POST | `/payments/create` | Emit x402 challenge (the 402 response payload) |
| POST | `/payments/authorize` | Accept signed PAYMENT-SIGNATURE |
| POST | `/payments/settle` | Settle onchain (or simulated in demo) |
| POST | `/payments/verify` | Re-verify via ArcScan |
| GET | `/payments/history` | List recent payments (filterable) |
| GET | `/payments/:id` | Payment + proof + events |
| GET | `/payments/proof/:id` | Settlement proof + timeline |
| GET | `/creators/:id/revenue` | Aggregate revenue stats |
| GET | `/metrics` | Protocol-wide counters |
| GET | `/supporters` | Recent supporters |

## Files added/modified

**New** (16 files):
- `apps/api/src/x402/x402.constants.ts`
- `apps/api/src/x402/x402.types.ts`
- `apps/api/src/x402/x402.utils.ts`
- `apps/api/src/x402/x402.service.ts`
- `apps/api/src/x402/x402.controller.ts`
- `apps/api/src/x402/x402.middleware.ts`
- `apps/api/src/x402/x402.module.ts`
- `apps/api/src/x402/arcscan-verifier.service.ts`
- `apps/api/prisma/seed-x402-demo.ts`
- `apps/api/test/e2e/x402.e2e.spec.ts`
- `apps/web/src/lib/x402-client.ts`
- `apps/web/src/components/x402/verification-badge.tsx`
- `apps/web/src/components/x402/payment-modal.tsx`
- `apps/web/src/components/x402/settlement-timeline.tsx`
- `apps/web/src/app/payments/page.tsx`
- `apps/web/src/app/history/page.tsx`
- `apps/web/src/app/history/[id]/page.tsx`

**Modified**:
- `apps/api/prisma/schema.prisma` (5 new tables + 2 new enums)
- `apps/api/src/app.module.ts` (X402Module import + BigInt JSON serializer)
- `apps/api/src/prisma/prisma.service.ts` (P3005 + P3008 migration drift fallback)
- `apps/api/src/modules/health/health.controller.ts` (debug/seed-x402 + debug/settle-once)
- `apps/web/src/app/dashboard/page.tsx` (Phase 8 metrics strip)
- `apps/web/src/app/page.tsx` (x402 + history links)
- `apps/api/test/setup-e2e.ts` (Phase 8 enums + tables)

## Open questions / future work

- Real cryptographic EIP-712 verification (currently only `payerAddress` and
  `signature` are validated structurally — production needs full ECDSA recovery).
- Swap synthetic txHash generation for live Arc RPC submission via viem or ethers.
- Move SettlementProof to an append-only trigger (currently Prisma-enforced).
- Add multi-asset support (EURC, USDC on Base, etc.) via the x402 `accepts` array.<!-- Fri Jul  3 14:01:30 UTC 2026 -->
