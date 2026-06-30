# `analytics/` — Protocol Metrics

> Maintains the live counter + materialized-aggregate surface that powers the public dashboards, the creator dashboard, and the operator dashboard. Documented in [`docs/analytics.md`](../../../docs/analytics.md).

## Purpose

The Citation Engine emits `citation.recorded` and `payment.settled` events. This subpackage consumes them and maintains:

1. **Real-time counters** in Redis (per-agent rate, per-Citation latency).
2. **Hot gauges** in Postgres + materialized views (last 24h metrics).
3. **Cold time-series** in Postgres (all-time aggregations).
4. **Public dashboards** via JSON snapshots cached at the edge.
5. **CSV/Parquet exports** for researchers.

## Files

| File | Responsibility |
|------|----------------|
| `indexer.ts` | BullMQ consumer of `citation.recorded` + `payment.settled`. Writes materialized views. |
| `metrics.ts` | Real-time counter primitives (Redis-backed). |
| `rollups.ts` | Hourly / daily / weekly / monthly rollup jobs. |
| `dashboards/` | Public / creator / agent / operator dashboards. |
| `export.ts` | CSV + Parquet streaming export. |
| `top.ts` | Top-Sources / Top-Domains / Top-Creators queries (with HNSW + materialized views). |
| `fraud-metrics.ts` | Per-attack counters, quarantine rate, false-positive/negative rates. |
| `snapshots.ts` | Public daily snapshot at `analytics.nanoproof.xyz/snapshot/<date>.parquet.zst`. |
| `webhooks.ts` | Outbound webhook subscriptions for downstream consumers. |

## Public API

```typescript
export interface Indexer {
  onCitationRecorded(event: CitationRecordedEvent): Promise<void>;
  onPaymentSettled(event: PaymentSettledEvent): Promise<void>;
}

export interface Metrics {
  counter(name: string, tags?: Record<string, string>): Counter;
  gauge(name: string, tags?: Record<string, string>): Gauge;
  histogram(name: string, tags?: Record<string, string>): Histogram;
}

export interface AnalyticsExporter {
  csv(scope: ExportScope, range: DateRange): ReadableStream;
  parquet(scope: ExportScope, range: DateRange): Promise<Buffer>;
}
```

## Rollup schedule

| Bucket | Cadence | Stored in |
|--------|---------|-----------|
| `hour` | every hour | Postgres `analytics_rollups` (TTL 7d) |
| `day` | every hour, last 24h | Postgres `analytics_rollups` (TTL 90d) |
| `week` | daily | Postgres `analytics_rollups` (TTL 1y) |
| `month` | daily | Postgres `analytics_rollups` (TTL forever) |

Public dashboards read the highest-resolution bucket available for the requested time range.

## See also

- [`docs/analytics.md`](../../../docs/analytics.md)
- [`../core/`](../core/README.md)
- [`../../../apps/api/src/analytics/`](../../../apps/api/src/analytics/README.md)