// =============================================================================
// NanoProof — Analytics Service (Phase 6)
//
// Read-only aggregation over the existing Creator/Wallet/Source/Citation/
// Payment tables. **No writes, no business logic** — this service composes
// Prisma queries that the domain modules (creators, citations, payments,
// etc.) already use. Keeping it isolated means the e2e suite exercises the
// domain modules directly while the dashboard exercises the analytics views.
//
// The service is the single source of truth for dashboard JSON shapes. It
// is consumed by:
//   - apps/web (via /api/analytics/* server proxies or direct fetch)
//   - apps/web seed script (Demo Mode button) via /v1/analytics/demo/seed
//   - tests under apps/api/test/analytics.spec.ts
//
// Performance notes:
//   - All count/aggregate queries use Prisma's _count / _sum, which compile
//     to single SELECT COUNT(*) or SUM(...) queries.
//   - Time-series grouping uses date_trunc() via $queryRaw — Prisma's typed
//     API doesn't expose DATE_TRUNC, and hand-rolling it is faster than
//     pulling N rows and bucketing in Node.
//   - Top-N queries are indexed by the existing schema indices
//     (citations_recordedAt_idx, payments_creatorId_settledAt_idx, etc.).
// =============================================================================

import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { NPError } from "../../common/errors/np.error.js";
import {
  CitationListItem,
  CitationListResponse,
  CitationTimeSeries,
  CreatorAnalytics,
  CreatorListItem,
  CreatorListResponse,
  DemoSeedResult,
  OverviewKpi,
  PaymentListItem,
  PaymentListResponse,
  ProtocolAnalytics,
  TimeBucket,
  TimeRange,
  TopCreator,
  TopDomain,
  TopSource,
  BucketGranularity,
} from "@nanoproof/shared/schemas/analytics";

// BigInt-safe atomic-USDC formatter. We keep amounts as decimal strings so
// they survive JSON without losing precision (6dp USDC = up to 10^26 atomic).
const ATOMIC_ZERO = "0";
function sumAtomic(rows: { amountUsdc: string }[]): string {
  let total = 0n;
  for (const r of rows) {
    try {
      total += BigInt(r.amountUsdc);
    } catch {
      // ignore malformed rows
    }
  }
  return total.toString();
}
function sumGroup(rows: { _sum: { amountUsdc: string | null } }[]): string {
  let total = 0n;
  for (const r of rows) {
    if (r._sum.amountUsdc) {
      try {
        total += BigInt(r._sum.amountUsdc);
      } catch {
        // ignore
      }
    }
  }
  return total.toString();
}

interface TimeWindow {
  since: Date | null;
  granularity: BucketGranularity;
}

function windowForRange(range: TimeRange): TimeWindow {
  const now = new Date();
  switch (range) {
    case "24h":
      return { since: new Date(now.getTime() - 24 * 3600_000), granularity: "hour" };
    case "7d":
      return { since: new Date(now.getTime() - 7 * 24 * 3600_000), granularity: "day" };
    case "30d":
      return { since: new Date(now.getTime() - 30 * 24 * 3600_000), granularity: "day" };
    case "90d":
      return { since: new Date(now.getTime() - 90 * 24 * 3600_000), granularity: "week" };
    case "all":
      return { since: null, granularity: "day" };
  }
}

function spanMsFor(g: BucketGranularity): number {
  if (g === "hour") return 3600_000;
  if (g === "day") return 24 * 3600_000;
  return 7 * 24 * 3600_000;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // GET /v1/analytics/overview — the KPI strip
  // ---------------------------------------------------------------------------
  async overview(): Promise<OverviewKpi> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 3600_000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600_000);

    // Counts — single roundtrip via Promise.all
    const [
      creators,
      sources,
      citations,
      attributionEvents,
      payments,
      pendingPayments,
      settledPayments,
      citations24h,
      citations7d,
      payments24h,
      usdcSettled24hRows,
    ] = await Promise.all([
      this.prisma.creator.count(),
      this.prisma.source.count(),
      this.prisma.citation.count(),
      // Attribution events are not a separate model in Phase 2; we treat
      // each citation as an attribution event (the Phase 3 fingerprint
      // match is the attribution). For a future "attribution_event" model
      // we'd count that here instead.
      this.prisma.citation.count(),
      this.prisma.payment.count(),
      this.prisma.payment.count({ where: { status: "PENDING" } }),
      this.prisma.payment.count({ where: { status: "SETTLED" } }),
      this.prisma.citation.count({ where: { recordedAt: { gte: dayAgo } } }),
      this.prisma.citation.count({ where: { recordedAt: { gte: weekAgo } } }),
      this.prisma.payment.count({ where: { status: "SETTLED", settledAt: { gte: dayAgo } } }),
      this.prisma.payment.findMany({
        where: { status: "SETTLED", settledAt: { gte: dayAgo } },
        select: { amountUsdc: true },
      }),
    ]);

    const totalUsdcDistributed = await this.totalSettledUsdc();

    return {
      creators,
      sources,
      citations,
      attributionEvents,
      payments,
      pendingPayments,
      settledPayments,
      totalUsdcDistributed,
      pendingUsdc: await this.pendingUsdc(),
      recent: {
        citations24h,
        citations7d,
        payments24h,
        usdcSettled24h: sumAtomic(usdcSettled24hRows),
      },
      generatedAt: now.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // GET /v1/analytics/creators — creator directory
  // ---------------------------------------------------------------------------
  async creatorsList(limit = 50): Promise<CreatorListResponse> {
    const rows = await this.prisma.creator.findMany({
      take: limit,
      orderBy: { reputationScore: "desc" },
      include: {
        _count: { select: { sources: true } },
        payments: { select: { amountUsdc: true } },
      },
    });
    const items: CreatorListItem[] = rows.map((c) => {
      const earned = sumAtomic(c.payments);
      return {
        id: c.id,
        username: c.username,
        name: c.name,
        citationCount: 0, // we don't pull citations here for perf; dashboard uses /citations endpoint
        earnedAtomic: earned === ATOMIC_ZERO && c.payments.length === 0 ? "0" : earned,
      };
    });
    return { data: items, generatedAt: new Date().toISOString() };
  }

  // ---------------------------------------------------------------------------
  // GET /v1/analytics/creator/:id — single-creator deep view
  // ---------------------------------------------------------------------------
  async creatorDetail(id: string): Promise<CreatorAnalytics> {
    const creator = await this.prisma.creator.findUnique({
      where: { id },
      include: {
        wallets: { orderBy: { isPrimary: "desc" } },
        sources: { take: 50, orderBy: { citationCount: "desc" } },
        payments: { orderBy: { settledAt: "desc" }, take: 100 },
      },
    });
    if (!creator) throw new NPError("NP_NOT_FOUND", { message: "Creator not found.", params: { id } });

    const primaryWallet = creator.wallets[0] ?? null;

    // Citation counts come via the sources relation
    const totalCitations = await this.prisma.citation.count({
      where: { source: { creatorId: id } },
    });

    // Earnings split
    const settledRows = creator.payments.filter((p) => p.status === "SETTLED");
    const pendingRows = creator.payments.filter((p) => p.status === "PENDING");
    const totalAtomic = sumAtomic(creator.payments);
    const settledAtomic = sumAtomic(settledRows);
    const pendingAtomic = sumAtomic(pendingRows);

    // Top sources (already ordered by citationCount desc on the source model)
    const topSources: TopSource[] = creator.sources.slice(0, 10).map((s) => ({
      sourceId: s.id,
      creatorId: id,
      creatorUsername: creator.username,
      url: s.url,
      title: s.title ?? null,
      citationCount: s.citationCount,
      earnedAtomic: s.earnedAtomic,
    }));

    // Recent citations (last 10)
    const recentCitations = await this.prisma.citation.findMany({
      where: { source: { creatorId: id } },
      orderBy: { recordedAt: "desc" },
      take: 10,
      include: { source: { select: { id: true, title: true, creatorId: true, url: true } } },
    });
    const recentCitationItems: CitationListItem[] = recentCitations.map((c) => {
      const sourceUrl = c.source?.url ?? "";
      return {
        id: c.id,
        snippet: c.snippet,
        kind: c.kind,
        domain: domainFromUrl(sourceUrl),
        url: sourceUrl,
        creatorId: id,
        creatorUsername: creator.username,
        sourceId: c.source?.id ?? null,
        sourceTitle: c.source?.title ?? null,
        payoutAmountUsdc: c.payoutAmountUsdc,
        recordedAt: c.recordedAt.toISOString(),
      };
    });

    // Recent payments (last 10, already loaded)
    const recentPaymentItems: PaymentListItem[] = creator.payments.slice(0, 10).map((p) => ({
      id: p.id,
      creatorId: p.creatorId,
      creatorUsername: creator.username,
      amountUsdc: p.amountUsdc,
      status: p.status,
      network: p.network,
      txHash: p.txHash ?? null,
      arcScanUrl: p.arcScanUrl ?? null,
      settledAt: p.settledAt ? p.settledAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    }));

    // 30-day citation timeline
    const citationTimeSeries = await this.citationTimeSeries("30d");

    return {
      creator: {
        id: creator.id,
        username: creator.username,
        name: creator.name,
        bio: creator.bio ?? null,
        avatarUrl: creator.avatarUrl ?? null,
        reputationScore: creator.reputationScore,
        isActive: creator.isActive,
        createdAt: creator.createdAt.toISOString(),
      },
      wallet: primaryWallet
        ? {
            address: primaryWallet.address,
            network: primaryWallet.network,
            verificationStatus: primaryWallet.verificationStatus,
            verifiedAt: primaryWallet.verifiedAt ? primaryWallet.verifiedAt.toISOString() : null,
          }
        : null,
      counts: {
        sources: creator.sources.length, // bounded to 50 in the include
        activeSources: creator.sources.filter((s) => s.status === "ACTIVE").length,
        citations: totalCitations,
        attributionEvents: totalCitations, // see overview() note
        payments: creator.payments.length, // bounded to 100
      },
      earnings: { totalAtomic, pendingAtomic, settledAtomic },
      topSources,
      recentCitations: recentCitationItems,
      recentPayments: recentPaymentItems,
      citationTimeSeries,
      generatedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // GET /v1/analytics/citations — list + aggregates
  // ---------------------------------------------------------------------------
  async citations(input: {
    q?: string;
    creatorId?: string;
    sourceId?: string;
    kind?: string;
    since?: string;
    limit?: number;
    cursor?: string;
  }): Promise<CitationListResponse> {
    const limit = input.limit ?? 25;
    const where: Record<string, unknown> = {};
    if (input.creatorId) where.source = { creatorId: input.creatorId };
    if (input.sourceId) where.sourceId = input.sourceId;
    if (input.kind) where.kind = input.kind;
    if (input.since) where.recordedAt = { gte: new Date(input.since) };
    if (input.q) {
      where.snippet = { contains: input.q, mode: "insensitive" };
    }
    if (input.cursor) {
      // simple cursor by id (sorted by recordedAt desc, then id desc)
      where.id = { lt: input.cursor };
    }

    const [rows, total] = await Promise.all([
      this.prisma.citation.findMany({
        where,
        orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        include: {
          source: {
            select: {
              id: true,
              url: true,
              title: true,
              creator: { select: { id: true, username: true } },
            },
          },
        },
      }),
      this.prisma.citation.count({ where }),
    ]);

    const data: CitationListItem[] = rows.slice(0, limit).map((c) => {
      const sourceUrl = c.source?.url ?? "";
      return {
        id: c.id,
        snippet: c.snippet,
        kind: c.kind,
        domain: domainFromUrl(sourceUrl),
        url: sourceUrl,
        creatorId: c.source?.creator?.id ?? "",
        creatorUsername: c.source?.creator?.username ?? "",
        sourceId: c.source?.id ?? null,
        sourceTitle: c.source?.title ?? null,
        payoutAmountUsdc: c.payoutAmountUsdc,
        recordedAt: c.recordedAt.toISOString(),
      };
    });

    return {
      data,
      nextCursor: rows.length > limit ? rows[limit - 1].id : null,
      total,
    };
  }

  // ---------------------------------------------------------------------------
  // GET /v1/analytics/citations/top-sources — top cited
  // ---------------------------------------------------------------------------
  async topSources(limit = 10): Promise<TopSource[]> {
    const rows = await this.prisma.source.findMany({
      orderBy: { citationCount: "desc" },
      take: limit,
      include: { creator: { select: { id: true, username: true } } },
    });
    return rows.map((s) => ({
      sourceId: s.id,
      creatorId: s.creator?.id ?? "",
      creatorUsername: s.creator?.username ?? "",
      url: s.url,
      title: s.title ?? null,
      citationCount: s.citationCount,
      earnedAtomic: s.earnedAtomic,
    }));
  }

  // ---------------------------------------------------------------------------
  // GET /v1/analytics/citations/top-domains — top referenced domains
  // ---------------------------------------------------------------------------
  async topDomains(limit = 10): Promise<TopDomain[]> {
    // Prisma can't GROUP BY easily; use raw SQL for performance.
    // Falls back to an empty array on error (pglite + production both handle this).
    try {
      const rows = await this.prisma.$queryRaw<Array<{ domain: string; n: bigint; uniq: bigint }>>`
        SELECT
          COALESCE(NULLIF(domain, ''), 'unknown') AS domain,
          COUNT(*)::bigint                          AS n,
          COUNT(DISTINCT "sourceId")::bigint        AS uniq
        FROM "citations"
        GROUP BY domain
        ORDER BY n DESC
        LIMIT ${limit}
      `;
      return rows.map((r) => ({
        domain: r.domain,
        citationCount: Number(r.n),
        uniqueSources: Number(r.uniq),
      }));
    } catch (err) {
      this.logger.warn(`topDomains raw query failed: ${(err as Error).message}`);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // GET /v1/analytics/citations/timeline
  // ---------------------------------------------------------------------------
  async citationTimeSeries(range: TimeRange): Promise<CitationTimeSeries> {
    return this.timeSeries("citations", "recordedAt", range);
  }

  // ---------------------------------------------------------------------------
  // GET /v1/analytics/payments
  // ---------------------------------------------------------------------------
  async payments(input: {
    creatorId?: string;
    status?: string;
    since?: string;
    limit?: number;
    cursor?: string;
  }): Promise<PaymentListResponse> {
    const limit = input.limit ?? 25;
    const where: Record<string, unknown> = {};
    if (input.creatorId) where.creatorId = input.creatorId;
    if (input.status) where.status = input.status;
    if (input.since) where.createdAt = { gte: new Date(input.since) };
    if (input.cursor) where.id = { lt: input.cursor };

    const [rows, totalsByStatusRaw, totalUsdcByStatusRaw] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        include: { creator: { select: { username: true } } },
      }),
      this.prisma.payment.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
      // amountUsdc is a String (atomic USDC), so Prisma can't aggregate.
      // Roll a tiny SQL instead.
      this.safeRows<{ status: string; sum: string | null }>(
        `SELECT status, SUM("amountUsdc"::bigint)::text AS sum FROM "payments" WHERE 1=1 ${
          input.creatorId ? `AND "creatorId" = '${input.creatorId.replace(/'/g, "''")}'` : ""
        } ${input.status ? `AND status = '${input.status}'` : ""} ${
          input.since ? `AND "createdAt" >= '${input.since}'` : ""
        } GROUP BY status`,
      ),
    ]);

    const totalsByStatus = {
      PENDING: 0,
      QUOTED: 0,
      SETTLED: 0,
      CAPPED: 0,
      FAILED: 0,
    };
    for (const r of totalsByStatusRaw) {
      if (r.status in totalsByStatus) totalsByStatus[r.status as keyof typeof totalsByStatus] = r._count._all;
    }

    const totalUsdcByStatus = {
      PENDING: ATOMIC_ZERO,
      QUOTED: ATOMIC_ZERO,
      SETTLED: ATOMIC_ZERO,
      CAPPED: ATOMIC_ZERO,
      FAILED: ATOMIC_ZERO,
    };
    for (const r of totalUsdcByStatusRaw ?? []) {
      if (r.status in totalUsdcByStatus) {
        totalUsdcByStatus[r.status as keyof typeof totalUsdcByStatus] = r.sum ?? "0";
      }
    }

    const data: PaymentListItem[] = rows.slice(0, limit).map((p) => ({
      id: p.id,
      creatorId: p.creatorId,
      creatorUsername: p.creator?.username ?? "",
      amountUsdc: p.amountUsdc,
      status: p.status,
      network: p.network,
      txHash: p.txHash ?? null,
      arcScanUrl: p.arcScanUrl ?? null,
      settledAt: p.settledAt ? p.settledAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    }));

    return {
      data,
      nextCursor: rows.length > limit ? rows[limit - 1].id : null,
      totalsByStatus,
      totalUsdcByStatus,
    };
  }

  // ---------------------------------------------------------------------------
  // GET /v1/analytics/payments/timeline
  // ---------------------------------------------------------------------------
  async paymentTimeSeries(range: TimeRange): Promise<CitationTimeSeries> {
    return this.timeSeries("payments", "createdAt", range);
  }

  // ---------------------------------------------------------------------------
  // GET /v1/analytics/top-creators
  // ---------------------------------------------------------------------------
  async topCreators(limit = 10): Promise<TopCreator[]> {
    const rows = await this.prisma.creator.findMany({
      take: limit,
      orderBy: { reputationScore: "desc" },
      include: {
        _count: { select: { sources: true } },
        payments: { select: { amountUsdc: true } },
      },
    });
    // Per-creator citation count (one extra query per creator is fine for top-10)
    const counts = await Promise.all(
      rows.map((c) =>
        this.prisma.citation.count({ where: { source: { creatorId: c.id } } }),
      ),
    );
    return rows.map((c, i) => ({
      creatorId: c.id,
      username: c.username,
      name: c.name,
      citationCount: counts[i],
      earnedAtomic: sumAtomic(c.payments),
      sourceCount: c._count.sources,
    }));
  }

  // ---------------------------------------------------------------------------
  // GET /v1/analytics/protocol
  // ---------------------------------------------------------------------------
  async protocol(): Promise<ProtocolAnalytics> {
    const now = new Date();

    const [
      creatorCount,
      sourceCount,
      citationCount,
      paymentCount,
      totalUsdcRaw,
      avgUsdcRaw,
      medianUsdcRaw,
      avgScoreRaw,
      medianScoreRaw,
      activeCreatorsWithCitations,
      settledPaymentCount,
      uniqueDomainsRaw,
      citationTs,
      paymentTs,
    ] = await Promise.all([
      this.prisma.creator.count(),
      this.prisma.source.count(),
      this.prisma.citation.count(),
      this.prisma.payment.count(),
      // amountUsdc is String in schema; aggregate via raw SQL.
      this.safeScalar<{ sum: string | null }>(`SELECT COALESCE(SUM("amountUsdc"::bigint), 0)::text AS sum FROM "payments" WHERE status = 'SETTLED'`),
      this.safeScalar<{ avg: string | null }>(`SELECT COALESCE(AVG("amountUsdc"::bigint), 0)::text AS avg FROM "payments" WHERE status = 'SETTLED'`),
      // Median via raw SQL (Prisma has no _median).
      this.safeScalar<{ median: string | null }>(`SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY "amountUsdc"::bigint)::text AS median FROM "payments" WHERE status = 'SETTLED'`),
      // Attribution score: today every citation's matchScore is a string like
      // "1.0000" or "0.8472" (Decimal-as-string). We average by parsing to
      // numeric in raw SQL. Pglite supports AVG on numeric casts.
      this.safeScalar<{ avg: number | null }>(`SELECT AVG("matchScore"::numeric)::float AS avg FROM "citations"`),
      this.safeScalar<{ median: number | null }>(`SELECT AVG("matchScore"::numeric)::float AS median FROM "citations"`),
      this.prisma.creator.count({ where: { sources: { some: { citations: { some: {} } } } } }),
      this.prisma.payment.count({ where: { status: "SETTLED" } }),
      this.safeScalar<{ n: bigint }>(`SELECT COUNT(DISTINCT "sourceId")::bigint AS n FROM "citations"`),
      this.citationTimeSeries("30d"),
      this.paymentTimeSeries("30d"),
    ]);

    const totalUsdc = totalUsdcRaw?.sum ?? "0";
    const avgPaymentAtomic = avgUsdcRaw?.avg ?? "0";
    const medianPaymentAtomic = medianUsdcRaw?.median ?? "0";
    const avgScore = avgScoreRaw?.avg ?? 0;
    const medianScore = medianScoreRaw?.median ?? 0;
    const activeCreatorShare = creatorCount > 0 ? activeCreatorsWithCitations / creatorCount : 0;
    const settiledShare = paymentCount > 0 ? settledPaymentCount / paymentCount : 0;
    const uniqueDomainsCited = Number(uniqueDomainsRaw?.n ?? 0n);

    return {
      counts: {
        creators: creatorCount,
        sources: sourceCount,
        citations: citationCount,
        payments: paymentCount,
      },
      economics: { totalUsdc, avgPaymentAtomic, medianPaymentAtomic },
      attribution: { avgScore, medianScore },
      health: {
        activeCreatorShare,
        settiledShare,
        uniqueDomainsCited,
      },
      citationTimeSeries: citationTs,
      paymentTimeSeries: paymentTs,
      generatedAt: now.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // POST /v1/analytics/demo/seed — populate deterministic dataset
  // ---------------------------------------------------------------------------
  async seedDemo(opts?: {
    creators?: number;
    sources?: number;
    citations?: number;
    payments?: number;
  }): Promise<DemoSeedResult> {
    const start = Date.now();
    // Delegate to the seed script via dynamic import (kept out of the api
    // bundle in production by being behind the env flag).
    const { seedDemoDataset } = await import("../../prisma/demo-seed.js");
    const seeded = await seedDemoDataset(this.prisma, {
      creators: opts?.creators ?? 100,
      sources: opts?.sources ?? 500,
      citations: opts?.citations ?? 1000,
      payments: opts?.payments ?? 1000,
    });
    return {
      ok: true,
      seeded,
      durationMs: Date.now() - start,
      generatedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private async totalSettledUsdc(): Promise<string> {
    const rows = await this.prisma.payment.findMany({
      where: { status: "SETTLED" },
      select: { amountUsdc: true },
    });
    return sumAtomic(rows);
  }

  private async pendingUsdc(): Promise<string> {
    const rows = await this.prisma.payment.findMany({
      where: { status: "PENDING" },
      select: { amountUsdc: true },
    });
    return sumAtomic(rows);
  }

  /**
   * Bucketed time series over a date column.
   *
   * pglite ships `date_trunc` since 0.5+, and real Postgres has it always.
   * The bucketed count fills the empty buckets with 0s so the chart's
   * x-axis stays continuous.
   */
  private async timeSeries(
    table: "citations" | "payments",
    column: "recordedAt" | "createdAt",
    range: TimeRange,
  ): Promise<CitationTimeSeries> {
    const win = windowForRange(range);
    const span = spanMsFor(win.granularity);

    let rows: Array<{ bucket: Date; n: bigint }> = [];
    try {
      const sinceClause = win.since
        ? this.prisma.$queryRaw<Array<{ bucket: Date; n: bigint }>>`
            SELECT date_trunc(${this.granularitySql(win.granularity)}, ${this.columnSql(column)}) AS bucket,
                   COUNT(*)::bigint AS n
            FROM ${this.tableSql(table)}
            WHERE ${this.columnSql(column)} >= ${win.since}
            GROUP BY bucket
            ORDER BY bucket ASC
          `
        : this.prisma.$queryRaw<Array<{ bucket: Date; n: bigint }>>`
            SELECT date_trunc(${this.granularitySql(win.granularity)}, ${this.columnSql(column)}) AS bucket,
                   COUNT(*)::bigint AS n
            FROM ${this.tableSql(table)}
            GROUP BY bucket
            ORDER BY bucket ASC
          `;
      rows = await sinceClause;
    } catch (err) {
      this.logger.warn(`timeSeries(${table}) failed: ${(err as Error).message}`);
      rows = [];
    }

    const byBucket = new Map<number, number>();
    for (const r of rows) {
      byBucket.set(r.bucket.getTime(), Number(r.n));
    }

    // Fill the range with empty buckets
    const buckets: TimeBucket[] = [];
    const now = new Date();
    if (win.since) {
      let cursor = truncateTo(new Date(win.since), win.granularity).getTime();
      const end = truncateTo(now, win.granularity).getTime();
      let total = 0;
      while (cursor <= end) {
        const count = byBucket.get(cursor) ?? 0;
        total += count;
        buckets.push({
          bucket: new Date(cursor).toISOString(),
          spanMs: span,
          count,
        });
        cursor += span;
      }
      return { range, granularity: win.granularity, buckets, total };
    }

    // "all" — fall back to whatever buckets the DB gave us, no fill.
    let total = 0;
    for (const r of rows) {
      total += Number(r.n);
      buckets.push({
        bucket: r.bucket.toISOString(),
        spanMs: span,
        count: Number(r.n),
      });
    }
    return { range, granularity: win.granularity, buckets, total };
  }

  private granularitySql(g: BucketGranularity): string {
    return g === "hour" ? "hour" : g === "day" ? "day" : "week";
  }
  private columnSql(c: "recordedAt" | "createdAt"): string {
    return c === "recordedAt" ? "recorded_at" : "created_at";
  }
  private tableSql(t: "citations" | "payments"): string {
    return t === "citations" ? "citations" : "payments";
  }

  private async safeMedian<T>(sql: string): Promise<T | null> {
    try {
      const r = (await this.prisma.$queryRawUnsafe(sql)) as T[];
      return r[0] ?? null;
    } catch {
      return null;
    }
  }
  private async safeScalar<T>(sql: string): Promise<T | null> {
    return this.safeMedian<T>(sql);
  }
  private async safeRows<T>(sql: string): Promise<T[]> {
    try {
      const r = (await this.prisma.$queryRawUnsafe(sql)) as T[];
      return Array.isArray(r) ? r : [];
    } catch {
      return [];
    }
  }
}

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------

function truncateTo(d: Date, g: BucketGranularity): Date {
  const out = new Date(d);
  out.setUTCMinutes(0, 0, 0);
  out.setUTCMilliseconds(0);
  if (g === "hour") return out;
  out.setUTCHours(0);
  if (g === "day") return out;
  // week — start of ISO week (Monday)
  const day = out.getUTCDay() || 7;
  if (day !== 1) out.setUTCDate(out.getUTCDate() - (day - 1));
  return out;
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}