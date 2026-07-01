# Analytics API — Phase 6

> 12 read-only endpoints powering the Creator Analytics Dashboard.
> All return JSON. All require a valid API key with `READ_CITATIONS` +
> `READ_PAYMENTS` scopes. The demo seed additionally requires `ADMIN`.

## Authentication

```
Authorization: Bearer np_live_<prefix>.<secret>
```

Or via cookie (`np_api_key=<prefix>.<secret>`) for the web proxy.

## Atomic USDC

All amounts are atomic USDC (1 USDC = 1,000,000 atomic, 6 decimals). The
api returns them as decimal strings (`"1500000"` = $1.50). BigInt-safe
throughout — no precision loss on aggregate sums.

## Time ranges

`range` query param supports: `24h` (hourly), `7d` / `30d` (daily), `90d`
(weekly), `all` (no fill).

---

## GET /v1/analytics/overview

Protocol KPI strip.

**Response:**
```json
{
  "creators": 100,
  "sources": 487,
  "citations": 1000,
  "attributionEvents": 1000,
  "payments": 1000,
  "pendingPayments": 120,
  "settledPayments": 850,
  "totalUsdcDistributed": "5000000",
  "pendingUsdc": "60000",
  "recent": {
    "citations24h": 42,
    "citations7d": 280,
    "payments24h": 35,
    "usdcSettled24h": "175000"
  },
  "generatedAt": "2026-07-01T13:00:00.000Z"
}
```

---

## GET /v1/analytics/creators?limit=50

Creator directory, ordered by reputation score.

**Query params:**
- `limit` (1..200, default 50)

**Response:**
```json
{
  "data": [
    { "id": "cr_…", "username": "ada_lovelace_0", "name": "Ada Lovelace", "citationCount": 12, "earnedAtomic": "12345" }
  ],
  "generatedAt": "..."
}
```

---

## GET /v1/analytics/top-creators?limit=10

Earnings leaderboard.

**Response:** array of `TopCreator`:
```json
[
  { "creatorId": "cr_…", "username": "...", "name": "...", "citationCount": 47, "earnedAtomic": "234000", "sourceCount": 5 }
]
```

---

## GET /v1/analytics/creator/:id

Single-creator deep view.

**Response:** `CreatorAnalytics` — see `packages/shared/src/schemas/analytics.ts`.

Includes: profile, wallet, counts (sources, citations, payments),
earnings (total / pending / settled), top-10 sources, recent-10 citations,
recent-10 payments, 30-day citation timeline.

**Errors:** `404 NP_NOT_FOUND` if the creator doesn't exist.

---

## GET /v1/analytics/citations

Paginated citation list with search.

**Query params (all optional):**
- `q` (1..100 chars, snippet search, case-insensitive)
- `creatorId`, `sourceId`, `kind` (`DIRECT|INDIRECT|SUPPORTING|REFERENCE|CONTEXT`)
- `since` (ISO 8601)
- `limit` (1..200, default 25)
- `cursor` (opaque cursor)

**Response:** `CitationListResponse`

---

## GET /v1/analytics/citations/top-sources?limit=10

Top cited sources across the protocol.

---

## GET /v1/analytics/citations/top-domains?limit=10

Top referenced domains (grouped by source URL hostname).

---

## GET /v1/analytics/citations/timeline?range=30d

Citation volume time series. Bucketed counts.

**Query params:**
- `range` (`24h|7d|30d|90d|all`, default `30d`)

**Response:** `CitationTimeSeries`
```json
{
  "range": "30d",
  "granularity": "day",
  "buckets": [
    { "bucket": "2026-06-01T00:00:00.000Z", "spanMs": 86400000, "count": 5 },
    { "bucket": "2026-06-02T00:00:00.000Z", "spanMs": 86400000, "count": 12 }
  ],
  "total": 1000
}
```

---

## GET /v1/analytics/payments

Paginated payment list with status totals.

**Query params:**
- `creatorId`, `status` (`PENDING|QUOTED|SETTLED|CAPPED|FAILED`)
- `since` (ISO 8601)
- `limit`, `cursor`

**Response:** `PaymentListResponse` — includes `totalsByStatus` (counts)
and `totalUsdcByStatus` (atomic USDC sums) for the queried filter.

---

## GET /v1/analytics/payments/timeline?range=30d

Payment count time series. Same shape as citation timeline.

---

## GET /v1/analytics/protocol

Macro health view.

**Response:** `ProtocolAnalytics`
```json
{
  "counts": { "creators": 100, "sources": 487, "citations": 1000, "payments": 1000 },
  "economics": {
    "totalUsdc": "5000000",
    "avgPaymentAtomic": "5882",
    "medianPaymentAtomic": "5000"
  },
  "attribution": { "avgScore": 0.847, "medianScore": 0.85 },
  "health": {
    "activeCreatorShare": 0.92,
    "settiledShare": 0.85,
    "uniqueDomainsCited": 17
  },
  "citationTimeSeries": {...},
  "paymentTimeSeries": {...},
  "generatedAt": "..."
}
```

---

## POST /v1/analytics/demo/seed

Populate the dashboard with a deterministic dataset. **Requires `ADMIN`
scope and `NANOPROOF_DEMO_MODE=true` on the api server.**

**Body (all optional):**
```json
{
  "creators": 100,
  "sources": 500,
  "citations": 1000,
  "payments": 1000
}
```

**Response:** `DemoSeedResult`
```json
{
  "ok": true,
  "seeded": { "creators": 100, "sources": 500, "citations": 1000, "attributionEvents": 1000, "payments": 1000 },
  "durationMs": 1240,
  "generatedAt": "..."
}
```

**Errors:** `403 NP_FORBIDDEN` if `NANOPROOF_DEMO_MODE` isn't set on the
server.

---

## Error envelope

All errors share the shape:
```json
{
  "code": "NP_AUTH_FAILED" | "NP_FORBIDDEN" | "NP_NOT_FOUND" | "NP_VALIDATION_FAILED" | "NP_INTERNAL_ERROR",
  "message": "...",
  "path": "/v1/analytics/...",
  "timestamp": "..."
}
```

`NP_INTERNAL_ERROR` (500) should be reported as a bug — every other
status code is a documented client mistake.