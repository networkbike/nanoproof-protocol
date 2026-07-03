# API Reference — NanoProof Protocol (Phase 8)

> Complete REST API reference for NanoProof's Phase 8 x402 payment protocol.
> All endpoints are public (no auth required) by design — x402 is open-agent-first.

## Base URL

- **Production**: `https://nanoproof-api-production.up.railway.app`
- **Local dev**: `http://localhost:4000`
- **WebSocket**: not used in Phase 8 (REST only)

## x402 endpoints (Phase 8)

### `POST /x402/demo`

One-click demo flow: create → authorize → settle → verify.

**Request body:**
```json
{
  "creatorId": "cr_demo_alice",
  "resource": "/v1/research/cite",   // optional, defaults to /v1/research/cite
  "amountUsdc": "1000",               // optional, atomic USDC; uses PRICE_CATALOG otherwise
  "payerAddress": "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"  // optional in demo mode
}
```

**Response 200:**
```json
{
  "challenge": {
    "x402Version": 1,
    "accepts": [{
      "scheme": "exact",
      "network": "eip155:5042002",
      "maxAmountRequired": "1000",
      "resource": "/v1/research/cite",
      "description": "NanoProof access: /v1/research/cite (creator alice)",
      "payTo": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "maxTimeoutSeconds": 60,
      "asset": "0x3600000000000000000000000000000000000000",
      "extra": {
        "name": "USDC",
        "version": "2",
        "validAfter": 0,
        "validBefore": 1751539200,
        "nonce": "0xa1b2c3..."
      }
    }]
  },
  "paymentRequestId": "preq_abc123",
  "payment": {
    "id": "pay_def456",
    "txHash": "0xdeadbeef...",
    "arcScanUrl": "https://testnet.arcscan.app/tx/0xdeadbeef..."
  },
  "proof": {
    "id": "sprf_ghi789",
    "paymentHash": "0xa1b2c3...",
    "verificationStatus": "VERIFIED"
  },
  "verification": { "status": "VERIFIED" },
  "response": {
    "success": true,
    "transactionHash": "0xdeadbeef...",
    "blockNumber": "9500123",
    "arcScanUrl": "https://testnet.arcscan.app/tx/0xdeadbeef...",
    "network": "eip155:5042002",
    "settledAt": "2026-07-03T11:30:48.123Z",
    "message": "Settlement confirmed. Resource unlocked."
  }
}
```

---

### `POST /payments/create`

Emit a fresh x402 challenge for a resource.

**Request body:**
```json
{
  "creatorId": "cr_demo_alice",
  "resource": "/v1/research/cite",
  "amountUsdc": "1000",             // optional
  "description": "Premium access",   // optional
  "validitySeconds": 60,             // optional, 10-3600
  "resourceId": "src_abc",           // optional
  "payerAddress": "0x...",            // optional
  "userAgent": "axios/1.x"            // optional
}
```

**Response 200:**
```json
{
  "paymentRequestId": "preq_abc123",
  "challenge": { /* x402 challenge JSON */ },
  "challengeBase64": "eyJ4NDAy..."
}
```

---

### `POST /payments/authorize`

Authorize a PaymentRequest after the client has signed the challenge.

**Request body:**
```json
{
  "requestId": "preq_abc123",
  "payerAddress": "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  "signature": "0x..."  // optional in demo mode
}
```

**Response 200:**
```json
{
  "paymentRequestId": "preq_abc123",
  "status": "AUTHORIZED",
  "authorizedAt": "2026-07-03T11:30:48.123Z"
}
```

---

### `POST /payments/settle`

Settle an authorized PaymentRequest onchain (or simulated in demo mode).

**Request body:**
```json
{
  "requestId": "preq_abc123",
  "payerAddress": "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"  // optional
}
```

**Response 200:**
```json
{
  "paymentId": "pay_def456",
  "txHash": "0xdeadbeef...",
  "arcScanUrl": "https://testnet.arcscan.app/tx/0xdeadbeef...",
  "proof": {
    "id": "sprf_ghi789",
    "paymentHash": "0xa1b2c3...",
    "verificationStatus": "VERIFIED"
  },
  "verification": { "status": "VERIFIED" },
  "response": { /* same as /x402/demo response */ }
}
```

---

### `POST /payments/verify`

Re-verify a SettlementProof by calling ArcScan.

**Request body:**
```json
{
  "proofId": "sprf_ghi789"
}
```

**Response 200:**
```json
{
  "proofId": "sprf_ghi789",
  "status": "VERIFIED"   // or "PENDING" | "FAILED"
}
```

---

### `GET /payments/history`

List recent payments (optionally filtered).

**Query parameters:**
- `creatorId` — optional, filter by creator
- `payerAddress` — optional, filter by payer wallet
- `limit` — optional, 1-200, default 50

**Response 200:**
```json
{
  "payments": [
    {
      "id": "pay_def456",
      "creatorId": "cr_demo_alice",
      "amountUsdc": "1000",
      "currency": "USDC",
      "network": "ARC_TESTNET",
      "status": "SETTLED",
      "txHash": "0x...",
      "arcScanUrl": "https://testnet.arcscan.app/tx/0x...",
      "blockNumber": "9500123",
      "settledAt": "2026-07-03T11:30:48.123Z",
      "createdAt": "2026-07-03T11:30:48.100Z"
    }
  ],
  "proofs": [ /* SettlementProof[] in same order */ ],
  "requests": [ /* PaymentRequest[] in same order */ ]
}
```

---

### `GET /payments/:id`

Get a Payment + its SettlementProof + VerificationEvents.

**Response 200:**
```json
{
  "found": true,
  "payment": { /* Payment */ },
  "request": { /* PaymentRequest */ },
  "proof": { /* SettlementProof or null */ },
  "events": [ /* VerificationEvent[] */ ]
}
```

Returns `{ found: false, paymentId }` if not found.

---

### `GET /payments/proof/:id`

Get a SettlementProof + its full verification timeline.

**Response 200:**
```json
{
  "found": true,
  "proof": {
    "id": "sprf_ghi789",
    "paymentHash": "0xa1b2...",
    "txHash": "0x...",
    "blockNumber": "9500123",
    "blockTimestamp": "2026-07-03T11:30:48Z",
    "arcScanUrl": "https://testnet.arcscan.app/tx/0x...",
    "verificationStatus": "VERIFIED",
    "verificationAttempts": 1,
    "lastCheckedAt": "2026-07-03T11:30:48Z",
    "confirmedAt": "2026-07-03T11:30:48Z",
    "prevHash": "0x...",
    "hash": "0x...",
    "createdAt": "2026-07-03T11:30:48Z"
  },
  "payment": { /* Payment */ },
  "events": [
    {
      "id": "vev_jkl012",
      "proofId": "sprf_ghi789",
      "txHash": "0x...",
      "status": "VERIFIED",
      "confirmations": 1,
      "source": "SYNTHETIC",
      "payload": { /* full verifier response */ },
      "blockNumber": "9500123",
      "errorMessage": null,
      "checkedAt": "2026-07-03T11:30:48Z"
    }
  ]
}
```

---

### `GET /creators/:id/revenue`

Aggregate revenue stats for a creator.

**Response 200:**
```json
{
  "creatorId": "cr_demo_alice",
  "totalPayments": 9,
  "settledPayments": 9,
  "totalUsdcSettled": "9000",
  "totalUsdcDisplay": "0.009",
  "uniqueSupporters": 1,
  "firstSettlementAt": "2026-07-03T11:30:40.502Z",
  "lastSettlementAt": "2026-07-03T11:30:48.523Z",
  "byDay": [
    {
      "date": "2026-07-03",
      "usdc": "0.009",
      "count": 9
    }
  ]
}
```

---

### `GET /metrics`

Protocol-wide counters.

**Response 200:**
```json
{
  "totalPayments": 31,
  "totalSettlements": 31,
  "totalVerifications": 30,
  "totalVerified": 30,
  "totalFailed": 0,
  "totalUsdcDistributed": "134000",
  "totalUsdcDisplay": "0.134",
  "uniqueSupporters": 4,
  "uniqueCreators": 4,
  "x402ChallengesServed": 31,
  "x402PaymentsSettled": 31,
  "lastSettlementAt": "2026-07-03T11:30:48.623Z",
  "lastVerifiedAt": "2026-07-03T11:30:48.597Z",
  "updatedAt": "2026-07-03T11:30:48.665Z"
}
```

---

### `GET /supporters`

Recent supporter wallets.

**Query parameters:**
- `limit` — optional, 1-100, default 20

**Response 200:**
```json
[
  {
    "address": "0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc",
    "totalPaid": "9000",
    "totalPaidDisplay": "0.009",
    "totalPayments": 9,
    "lastSeenAt": "2026-07-03T11:30:48.523Z"
  }
]
```

---

## Error format

All errors return:
```json
{
  "code": "NP_VALIDATION_FAILED",
  "message": "Invalid body.",
  "details": {
    "params": {
      "target": "body",
      "issues": [
        { "code": "invalid_string", "validation": "regex", "path": ["payerAddress"], "message": "Invalid" }
      ]
    }
  },
  "path": "/payments/create",
  "timestamp": "2026-07-03T11:30:48.123Z"
}
```

### Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `NP_NOT_FOUND` | 404 | Resource not found |
| `NP_VALIDATION_FAILED` | 422 | Zod validation failed |
| `NP_FORBIDDEN` | 403 | Auth scope missing |
| `NP_USERNAME_RESERVED` | 422 | Reserved username |
| `NP_INTERNAL_ERROR` | 500 | Unhandled error |

---

## Atomic USDC amounts

USDC has 6 decimals on the ERC-20 interface. We use **strings** (not numbers)
to preserve precision:

| Display | Atomic (string) |
|---|---|
| $0.001 | `"1000"` |
| $0.01 | `"10000"` |
| $0.10 | `"100000"` |
| $1.00 | `"1000000"` |
| $10.00 | `"10000000"` |

Never use `Number` for monetary values in this API.

---

## Health endpoints (Phase 0-7)

These continue to work as before:

- `GET /health` — k8s/Railway health (returns 200 with `{status:"ok"}`)
- `GET /v1/healthz` — full health with DB ping
- `GET /liveness` — process alive
- `GET /readiness` — DB reachable (200 ok, 503 degraded)
- `GET /docs` — Swagger UI (all endpoints)

---

## Phase 8 demo seed (debug only)

For the Lepton demo, a `/debug/seed-x402` endpoint seeds 4 demo creators +
30 settlements. **Remove before production** (or guard with admin auth).

```bash
# Seed 30 demo settlements
curl https://nanoproof-api-production.up.railway.app/debug/seed-x402?count=30

# Returns:
{
  "ok": true,
  "creators": 4,
  "settlementsCreated": 30,
  "settlementsFailed": 0,
  "metrics": { /* ProtocolMetrics */ }
}
```

Other debug endpoints (`/debug/tables`, `/debug/db-push`, `/debug/resolve-applied`,
`/debug/permissions`, `/debug/settle-once`) are also available for incident
response. All marked `@Public()` for now — should be moved behind admin auth
before production.

---

## Where to read more

- x402 spec deep dive: `docs/X402_IMPLEMENTATION.md`
- Payment flow: `docs/PAYMENT_FLOW.md`
- Arc settlement: `docs/ARC_SETTLEMENT.md`
- Phase 8 overview: `docs/PHASE8.md`