# Phase 6 — Creator Analytics Dashboard

> Shipped: 2026-07-01
> Branch: `main` (commits `c629708` and following)

## What is Phase 6?

A read-only, judge-facing dashboard that visualises the NanoProof creator
economy end-to-end:

```
Creator ──► Citation ──► Attribution ──► Payment ──► Settlement
   ▲           ▲             ▲             ▲             ▲
   │           │             │             │             │
 register   AI agent    fingerprint    USDC mint   on-chain
 source     cites       match + score  to creator   confirmation
```

It is **not** an admin dashboard. It exists to show, at a glance, how a
creator earns when an AI cites their work.

## Routes

| Route                              | Purpose                                                |
| ---------------------------------- | ------------------------------------------------------ |
| `/dashboard`                       | Hero overview — KPI strip + flow chart + 30-day charts |
| `/dashboard/creators`              | Creator directory with top-earners podium              |
| `/dashboard/creator/[id]`          | Single-creator deep view (profile, sources, recent)    |
| `/dashboard/citations`             | Citation list + top sources + top domains + search     |
| `/dashboard/payments`              | Payment status breakdown + recent transactions        |
| `/dashboard/protocol`              | Macro health view (adoption, throughput, attribution)  |

## API surface (apps/api/src/modules/analytics/)

12 endpoints, all read-only:

| Method | Path                                       | Returns                  |
| ------ | ------------------------------------------ | ------------------------ |
| GET    | `/v1/analytics/overview`                   | `OverviewKpi`            |
| GET    | `/v1/analytics/creators`                   | `CreatorListResponse`    |
| GET    | `/v1/analytics/top-creators`               | `TopCreator[]`           |
| GET    | `/v1/analytics/creator/:id`                | `CreatorAnalytics`       |
| GET    | `/v1/analytics/citations`                  | `CitationListResponse`   |
| GET    | `/v1/analytics/citations/top-sources`      | `TopSource[]`            |
| GET    | `/v1/analytics/citations/top-domains`      | `TopDomain[]`            |
| GET    | `/v1/analytics/citations/timeline`         | `CitationTimeSeries`     |
| GET    | `/v1/analytics/payments`                   | `PaymentListResponse`    |
| GET    | `/v1/analytics/payments/timeline`          | `CitationTimeSeries`     |
| GET    | `/v1/analytics/protocol`                   | `ProtocolAnalytics`      |
| POST   | `/v1/analytics/demo/seed`                  | `DemoSeedResult`         |

All endpoints require a valid API key with `READ_CITATIONS` + `READ_PAYMENTS`
scopes (the global `APP_GUARD` enforces this). The demo seed additionally
requires `ADMIN` scope and the env flag `NANOPROOF_DEMO_MODE=true`.

See `docs/analytics-api.md` for full request/response shapes.

## Demo Mode

The "Load Demo Dataset" button (sidebar of every dashboard page) calls
`POST /api/analytics/demo/seed`, which:

1. Wipes any existing `demo_*` rows in creators / sources / citations /
   payments (disabling the Phase-2 append-only triggers in a transaction).
2. Re-seeds 100 creators, 500 sources, 1000 citations, 1000 payments
   using a deterministic PRNG (mulberry32, seed=42) — same dataset every
   run.
3. Backfills `Source.citationCount` and `Source.earnedAtomic` via a
   single UPDATE FROM.
4. Calls `router.refresh()` so all server components re-render with the
   new data.

The button shows a brief summary on success ("✅ 100c / 500s / 1000cit / 1000pay")
or the error message if `NANOPROOF_DEMO_MODE` isn't set.

## Implementation notes

### Aggregation strategy

- Count / aggregate queries use Prisma's typed API where possible.
- `amountUsdc` is a `String` column (atomic USDC, bigint-precision).
  Prisma can't aggregate on String, so we drop to raw SQL:
  `SUM("amountUsdc"::bigint)::text`.
- Time-series grouping uses `date_trunc()` via `$queryRawUnsafe`, with
  the JS side filling empty buckets so charts render continuous x-axes.
- Top-N uses indexed `orderBy` on the schema's denormalized counters.
- Domain grouping uses raw SQL (Prisma's GROUP BY isn't ergonomic).

### Why a service layer, not just controllers?

Every dashboard endpoint reads from a different combination of tables. To
keep controllers thin and the e2e harness able to test the analytics
service directly, all aggregation lives in `AnalyticsService`. The
controller is just request-shaping + auth scoping.

### Files

```
apps/api/src/modules/analytics/
├── analytics.module.ts            # Nest module registration
├── analytics.controller.ts        # 12 endpoints + Zod validation
├── analytics.service.ts           # ~700 lines of aggregation
└── analytics.service.spec.ts      # 5 unit tests

apps/api/src/prisma/
└── demo-seed.ts                   # 100/500/1000/1000 deterministic dataset

apps/api/test/e2e/
└── analytics.e2e.spec.ts          # 13 e2e tests against pglite-socket

apps/api/prisma/
└── demo-seed.ts                   # CLI runner: `tsx prisma/demo-seed.ts`

apps/web/src/app/dashboard/
├── layout.tsx                     # Shared sidebar + nav
├── page.tsx                       # /dashboard — overview
├── creators/page.tsx              # /dashboard/creators
├── creator/[id]/page.tsx          # /dashboard/creator/[id]
├── citations/page.tsx             # /dashboard/citations
├── payments/page.tsx              # /dashboard/payments
└── protocol/page.tsx              # /dashboard/protocol

apps/web/src/app/api/analytics/demo/seed/
└── route.ts                       # Server proxy: forwards to api

apps/web/src/components/
├── ui/                            # Card, Button, Badge, Table (shadcn-style)
└── dashboard/
    ├── citation-timeline-chart.tsx # Area chart (Recharts)
    ├── payment-status-donut.tsx    # Donut chart
    └── demo-button.tsx             # One-click seed

apps/web/src/lib/
├── analytics-client.ts            # Server-side api client
├── utils.ts                       # formatUsd, formatCount, etc.
└── utils.spec.ts                  # 7 unit tests

packages/shared/src/schemas/
└── analytics.ts                   # 12 Zod response/request shapes
```

## Test summary

| Suite                       | Tests | Where                           |
| --------------------------- | ----- | ------------------------------- |
| `apps/api` unit             | 19    | `pnpm --filter @nanoproof/api test`    |
| `apps/api` e2e              | 21    | `pnpm --filter @nanoproof/api test:e2e`|
| `apps/web` unit             | 7     | `pnpm --filter @nanoproof/web test`    |
| `packages/agent` unit       | 16    | `pnpm --filter @nanoproof/agent test`  |
| **Total**                   | **63**|                                 |

The e2e suite covers all 12 analytics endpoints plus idempotency of the
demo seed.

## What's NOT in Phase 6

- **Realtime updates.** The dashboard is server-rendered with `cache: "no-store"`.
  Clicking "Load Demo Dataset" triggers a `router.refresh()`. A websocket
  push would be Phase 7.
- **Timezone support.** All timestamps render in the browser's locale but
  are bucketed in UTC. Multi-region creators would benefit from per-creator
  timezone support.
- **CSV export.** Mentioned in the brief; deferred to Phase 7.
- **Per-source detail page.** `/dashboard/source/[id]` is a follow-up.
- **Per-payment detail page.** `/dashboard/payment/[id]` is a follow-up.
- **Attribution score model.** Today `matchScore` is a stringified decimal
  populated at insert time. A real ML model that scores attribution quality
  is Phase 8 work (separate from the dashboard).