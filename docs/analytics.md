# Analytics & Protocol Metrics

> The Analytics layer turns Citation Engine activity into public, queryable metrics that creators, agents, and the protocol itself can use to track health, fairness, and growth.

---

## Table of contents

- [Goals](#goals)
- [Metric categories](#metric-categories)
- [Per-metric definitions](#per-metric-definitions)
- [Dashboards](#dashboards)
- [Public vs. private metrics](#public-vs-private-metrics)
- [Storage and freshness](#storage-and-freshness)
- [API surface](#api-surface)
- [Export + sync](#export--sync)
- [Future metrics](#future-metrics)
- [See also](#see-also)

---

## Goals

1. **Transparency.** Anyone can verify the protocol is fair and paying creators accurately.
2. **Creators see their impact.** Citation volume, attribution accuracy, and earnings per Source.
3. **Agents see their spend.** Per-Source, per-period, per-cap utilization.
4. **Operators detect abuse.** Fraud signals + quarantine rate + dispute rate.
5. **Researchers study the agent economy.** Public API + CSV exports.

---

## Metric categories

| Category | Audience | Examples |
|----------|----------|----------|
| **Protocol** | Everyone | Total citations, total USDC paid, network uptime |
| **Creator** | The Creator | Citations received, attribution accuracy, period cap utilization |
| **Source** | The Creator + public | Citation volume, top agents, earnings curve |
| **Agent** | The agent developer | Per-Source spend, cap utilization, error rate |
| **Fraud** | Operators + public | Detection events, quarantine rate, clawback amounts |
| **Quality** | Operators | Attribution accuracy, false-positive/negative rates |

---

## Per-metric definitions

### Protocol metrics (public)

| Metric | Type | Definition |
|--------|------|------------|
| `protocol.citations.total` | counter | Total Citations ever recorded |
| `protocol.citations.verified` | counter | Citations whose Source is `ACTIVE` at recording time |
| `protocol.citations.disputed` | counter | Citations with at least one active dispute |
| `protocol.citations.quarantined` | counter | Citations auto-quarantined by fraud detection |
| `protocol.usdc.paid.total` | counter | Total USDC settled on Arc (atomic units) |
| `protocol.usdc.paid.last_24h` | gauge | USDC paid in last 24h |
| `protocol.usdc.paid.last_7d` | gauge | USDC paid in last 7 days |
| `protocol.usdc.escrow.held` | gauge | USDC currently held in escrow (holding period) |
| `protocol.sources.active` | gauge | Distinct Sources with `status = ACTIVE` |
| `protocol.creators.active` | gauge | Distinct Creators with `isActive = true` |
| `protocol.agents.active` | gauge | Distinct agents with Citations in last 24h |
| `protocol.attribution.accuracy` | gauge | Fraction of Citations not disputed (rolling 30d) |
| `protocol.attribution.p50_score` | gauge | Median Citation match score |
| `protocol.attribution.p99_score` | gauge | p99 Citation match score |
| `protocol.uptime` | gauge | API availability (last 30d) |

### Creator metrics (Creator-private + aggregate public)

| Metric | Type | Definition |
|--------|------|------------|
| `creator.<id>.citations.total` | counter | Citations across all Sources |
| `creator.<id>.citations.last_24h` | gauge | Citations in last 24h |
| `creator.<id>.usdc.earned.total` | counter | USDC earned (atomic) |
| `creator.<id>.usdc.earned.last_24h` | gauge | USDC earned in last 24h |
| `creator.<id>.sources.active` | gauge | Number of ACTIVE Sources |
| `creator.<id>.sources.disputed` | gauge | Number of Sources with active disputes |
| `creator.<id>.attribution.fraction.p50` | gauge | Median contribution fraction of Citations |
| `creator.<id>.top_sources` | list | Top 10 Sources by citation volume |
| `creator.<id>.top_agents` | list | Top 10 agents by Citation count |
| `creator.<id>.period_cap.utilization` | gauge | Fraction of period cap consumed |
| `creator.<id>.reputation_score` | gauge | Current reputation score |
| `creator.<id>.disputes.outstanding` | gauge | Disputes awaiting resolution |

### Source metrics (Creator-private + public-by-default for ACTIVE)

| Metric | Type | Definition |
|--------|------|------------|
| `source.<id>.citations.total` | counter | Citations |
| `source.<id>.citations.last_24h` | gauge | Citations in last 24h |
| `source.<id>.usdc.earned.total` | counter | USDC earned (atomic) |
| `source.<id>.usdc.earned.last_7d` | gauge | USDC earned in last 7 days |
| `source.<id>.top_citing_agents` | list | Top 10 agents by citation count |
| `source.<id>.match_score.p50` | gauge | Median match score |
| `source.<id>.period_cap.utilization` | gauge | Cap consumption |
| `source.<id>.disputes.count` | gauge | Disputes |
| `source.<id>.fingerprint.version` | gauge | Current canonical fingerprint version |

### Agent metrics (agent-private)

| Metric | Type | Definition |
|--------|------|------------|
| `agent.<id>.requests.total` | counter | Total analyze requests |
| `agent.<id>.requests.last_24h` | gauge | Analyze requests in last 24h |
| `agent.<id>.usdc.spent.total` | counter | USDC spent (atomic) |
| `agent.<id>.usdc.spent.last_24h` | gauge | USDC spent in last 24h |
| `agent.<id>.per_source_caps.utilization` | list | Per-Source cap utilization |
| `agent.<id>.reputation_score` | gauge | Reputation |
| `agent.<id>.error_rate` | gauge | 5xx rate (last 1h) |
| `agent.<id>.latency.p50` | gauge | Median analyze latency |
| `agent.<id>.latency.p99` | gauge | p99 analyze latency |

### Fraud metrics (operators + public aggregate)

| Metric | Type | Definition |
|--------|------|------------|
| `fraud.detection.events` | counter | Every flagged event |
| `fraud.detection.by_attack.<id>` | counter | Per-attack-type count |
| `fraud.quarantine.rate` | gauge | Fraction of Citations auto-quarantined |
| `fraud.false_positive.rate` | gauge | Quarantined → released |
| `fraud.false_negative.rate` | gauge | Disputes raised on non-quarantined Citations |
| `fraud.clawback.amount_usdc` | counter | Total USDC clawed back |
| `fraud.clawback.count` | counter | Number of clawback events |
| `fraud.disputes.outstanding` | gauge | Disputes awaiting resolution |
| `fraud.disputes.resolution.p50_time` | gauge | Median dispute resolution time |

### Quality metrics (operators)

| Metric | Type | Definition |
|--------|------|------------|
| `quality.attribution.match_score.p50` | gauge | Median match score (all Citations, last 24h) |
| `quality.attribution.match_score.p99` | gauge | p99 |
| `quality.attribution.false_positive_rate` | gauge | Disputed / total |
| `quality.attribution.false_negative_rate` | gauge | Manually added Citations that the engine missed |
| `quality.latency.analyze.p50` | gauge | Median analyze latency |
| `quality.latency.analyze.p99` | gauge | p99 |
| `quality.latency.persist.p99` | gauge | p99 time-to-persist |

---

## Dashboards

### Public dashboard (`/analytics`)

Renders:
- Protocol metrics over time (citations/day, USDC paid/day, active creators).
- Top 10 Sources (last 24h, last 7d, all-time).
- Top 10 Domains.
- Most Referenced Creators.
- Attribution accuracy trend.
- Fraud detection events feed.
- Network uptime.

No PII. Updates every 60 s.

### Creator dashboard (`/dashboard/analytics`)

Renders:
- Creator metrics (above).
- Per-Source breakdown.
- Earnings chart.
- Period cap utilization.
- Citation volume trend.
- Disputes queue.

Updates every 10 s (real-time feel without overwhelming the DB).

### Agent developer portal (`/developers/analytics`)

Renders:
- Per-source spend breakdown.
- Cap utilization.
- Latency + error rate.
- Recent citations feed (audit log of decisions).

Updates every 10 s.

### Operator dashboard (private)

Renders:
- All of the above + fraud drill-down.
- Per-Citation inspector (full evidence + replay).
- Quarantine queue.
- Dispute resolution interface.
- Threshold tuning controls (τ, weights).

---

## Public vs. private metrics

| Metric | Public | Authenticated creator | Authenticated agent | Operator |
|--------|--------|----------------------|---------------------|----------|
| Protocol aggregate | ✅ | ✅ | ✅ | ✅ |
| Specific creator's metrics | ❌ | ✅ | ❌ | ✅ |
| Specific source's metrics | ✅ if `ACTIVE` | ✅ | own citations only | ✅ |
| Specific agent's metrics | ❌ | own citations only | ✅ | ✅ |
| Fraud events (aggregate) | ✅ | own only | own only | ✅ |
| Per-Citation evidence | ❌ | own | own | ✅ |

---

## Storage and freshness

| Metric class | Storage | Freshness |
|--------------|---------|-----------|
| Real-time counters (per-agent rate, per-Citation latency) | Redis | <1s |
| Hot gauges (last 24h metrics) | Postgres + materialized views | 10s |
| Cold time-series (all-time, yearly aggregations) | Postgres + TimescaleDB extension (Phase 6+) | 60s |
| Public dashboards | Cached JSON in Vercel Edge | 60s |
| Agent portal | SSE push | 5s |

The Indexer worker is a BullMQ consumer of `citation.recorded` and `payment.settled` events. It maintains the materialized views.

---

## API surface

```
GET  /v1/analytics/protocol                  # public
GET  /v1/analytics/creator/:id              # creator-auth
GET  /v1/analytics/source/:id               # creator-auth or public if ACTIVE
GET  /v1/analytics/agent/:id                # agent-auth
GET  /v1/analytics/fraud                     # operator-auth
GET  /v1/analytics/top-sources               # public
GET  /v1/analytics/top-domains               # public
GET  /v1/analytics/top-creators              # public
GET  /v1/analytics/export.csv?from=&to=      # operator-auth
GET  /v1/analytics/export.parquet?from=&to=  # operator-auth
```

All endpoints return either:
- `application/json` with cursor pagination, or
- `text/csv` / `application/parquet` when the Accept header asks for it.

See [`../apps/api/openapi/citation-engine.yaml`](../apps/api/openapi/citation-engine.yaml) for the canonical schema.

---

## Export + sync

- **CSV export** — `/v1/analytics/export.csv` streams a CSV. Streams up to 10M rows.
- **Parquet export** — for downstream data warehouses (Clickhouse, BigQuery, Snowflake).
- **Webhook subscriptions** — `POST /v1/webhooks/analytics` to receive real-time metric events.
- **Public mirror** — daily snapshot at `https://analytics.nanoproof.xyz/snapshot/<YYYY-MM-DD>.parquet.zst`.

---

## Future metrics (post-Phase 9)

- **Cross-source attribution overlap** — which Sources tend to be cited together.
- **Topic clustering** — Sources clustered by embedding similarity.
- **Creator reputation over time** — long-term reputation curves.
- **Network effects** — Herfindahl–Hirschman Index of Source concentration.
- **Comparative benchmarks** — per-domain baselines (e.g. "your Source is cited 3.2× the median for an article of its length").

---

## See also

- [`citation-engine.md`](./citation-engine.md)
- [`fraud-prevention.md`](./fraud-prevention.md)
- [`attribution-model.md`](./attribution-model.md)
- [`../packages/citation-engine/README.md`](../packages/citation-engine/README.md)
- [`protocol-spec.md`](./protocol-spec.md)