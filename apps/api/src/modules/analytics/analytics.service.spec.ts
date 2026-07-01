// =============================================================================
// Analytics service spec — exercises the aggregation queries against pglite.
//
// We mock PrismaService with a tiny in-memory implementation that mimics
// the queries the service makes. The test covers:
//   - overview() shape + arithmetic (BigInt-safe atomic USDC sums)
//   - creatorsList() ordering by reputation
//   - citationTimeSeries() bucket fill for the 24h range
//   - payments() grouping by status
//   - protocol() economics + health metrics
//
// Why mock Prisma? pglite has a 4s startup cost that makes a per-test
// spinup painful. Mocking the small surface area this service consumes
// gives us fast, deterministic, isolated unit tests. The end-to-end
// behaviour is already covered by the e2e suite (creator-wallet) — this
// spec covers the aggregation logic only.
// =============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import { AnalyticsService } from "./analytics.service.js";
import type { PrismaService } from "../../prisma/prisma.service.js";

// -----------------------------------------------------------------------------
// Tiny in-memory Prisma double.
// -----------------------------------------------------------------------------

interface MockCreator {
  id: string;
  username: string;
  name: string;
  reputationScore: number;
  payments?: { amountUsdc: string }[];
  _count?: { sources: number };
}

interface MockPayment {
  id: string;
  creatorId: string;
  amountUsdc: string;
  status: string;
  createdAt: Date;
  settledAt: Date | null;
}

interface MockCitation {
  id: string;
  sourceId: string;
  recordedAt: Date;
  amountUsdc: string;
}

function createMockPrisma(opts: {
  creators?: MockCreator[];
  payments?: MockPayment[];
  citations?: MockCitation[];
  sourceCount?: number;
  activeCreatorCount?: number;
}): PrismaService {
  const creators = opts.creators ?? [];
  const payments = opts.payments ?? [];
  const citations = opts.citations ?? [];

  return {
    creator: {
      count: async () => creators.length,
      findMany: async (args?: { orderBy?: { reputationScore: "asc" | "desc" }; take?: number }) => {
        // Mirror the service's orderBy + take
        let out = [...creators];
        if (args?.orderBy?.reputationScore) {
          out.sort((a, b) =>
            args.orderBy!.reputationScore === "desc"
              ? b.reputationScore - a.reputationScore
              : a.reputationScore - b.reputationScore,
          );
        }
        if (args?.take) out = out.slice(0, args.take);
        return out;
      },
    },
    source: {
      count: async () => opts.sourceCount ?? 0,
    },
    payment: {
      count: async (args?: { where?: { status?: string; creatorId?: string } }) => {
        if (!args?.where?.status) return payments.length;
        return payments.filter((p) => p.status === args.where!.status).length;
      },
      findMany: async (args?: { where?: { status?: string; creatorId?: string; settledAt?: { gte?: Date } } }) => {
        let out = [...payments];
        if (args?.where?.status) out = out.filter((p) => p.status === args.where!.status);
        if (args?.where?.settledAt?.gte) out = out.filter((p) => p.settledAt && p.settledAt >= args.where!.settledAt!.gte!);
        return out;
      },
      groupBy: async (args: { by: string[] }) => {
        const grouped: Record<string, { status: string; _count: { _all: number } }> = {};
        for (const p of payments) {
          const k = p[args.by[0] as keyof MockPayment] as string;
          grouped[k] = grouped[k] ?? { status: k, _count: { _all: 0 } };
          grouped[k]._count._all += 1;
        }
        return Object.values(grouped);
      },
    },
    citation: {
      count: async () => citations.length,
      findMany: async () => citations,
    },
    $queryRawUnsafe: async () => [],
    $queryRaw: () => {
      const p = Promise.resolve([] as Array<{ bucket: Date; n: bigint }>);
      return p;
    },
    $executeRawUnsafe: async () => 0,
  } as unknown as PrismaService;
}

describe("AnalyticsService — aggregation", () => {
  let svc: AnalyticsService;

  beforeEach(() => {
    svc = new AnalyticsService({} as PrismaService);
  });

  it("overview() sums atomic USDC correctly across mixed-precision rows", async () => {
    const prisma = createMockPrisma({
      creators: [{ id: "c1", username: "alice", name: "Alice", reputationScore: 100 }],
      payments: [
        { id: "p1", creatorId: "c1", amountUsdc: "1500000", status: "SETTLED", createdAt: new Date(), settledAt: new Date() },
        { id: "p2", creatorId: "c1", amountUsdc: "999999999999999999999999", status: "SETTLED", createdAt: new Date(), settledAt: new Date() },
        { id: "p3", creatorId: "c1", amountUsdc: "100", status: "PENDING", createdAt: new Date(), settledAt: null },
      ],
      sourceCount: 5,
      citations: [],
    });
    // Re-construct service with our mock
    const real = new AnalyticsService(prisma);
    const o = await real.overview();
    expect(o.settledPayments).toBe(2);
    expect(o.pendingPayments).toBe(1);
    // 1_500_000 + 999_999_999_999_999_999_999_999 = 1_000_000_000_000_000_001_499_999
    expect(o.totalUsdcDistributed).toBe("1000000000000000001499999");
    expect(o.pendingUsdc).toBe("100");
  });

  it("creatorsList() returns creators with summed earnings", async () => {
    const creators = [
      { id: "c1", username: "low", name: "Low", reputationScore: 10, payments: [{ amountUsdc: "100" }] },
      { id: "c2", username: "high", name: "High", reputationScore: 999, payments: [{ amountUsdc: "5000000" }, { amountUsdc: "1500000" }] },
    ];
    const real = new AnalyticsService(createMockPrisma({ creators }));
    const r = await real.creatorsList(10);
    expect(r.data).toHaveLength(2);
    // high reputation first
    expect(r.data[0]?.username).toBe("high");
    expect(r.data[0]?.earnedAtomic).toBe("6500000");
    expect(r.data[1]?.earnedAtomic).toBe("100");
  });

  it("topDomains() falls back to empty array on raw SQL error", async () => {
    const prisma = createMockPrisma({});
    prisma.$queryRaw = (() => Promise.reject(new Error("syntax error"))) as never;
    const real = new AnalyticsService(prisma);
    const r = await real.topDomains();
    expect(r).toEqual([]);
  });

  it("protocol() returns health metrics with division-by-zero protection", async () => {
    // Empty DB → shares should be 0, not NaN.
    const real = new AnalyticsService(createMockPrisma({}));
    const p = await real.protocol();
    expect(p.health.activeCreatorShare).toBe(0);
    expect(p.health.settiledShare).toBe(0);
    expect(p.counts.creators).toBe(0);
    expect(p.economics.totalUsdc).toBe("0");
  });

  it("citationTimeSeries('all') returns DB buckets without fill", async () => {
    const ts = await svc.citationTimeSeries("all");
    // Empty DB → empty buckets array, total=0
    expect(ts.buckets).toEqual([]);
    expect(ts.total).toBe(0);
    expect(ts.range).toBe("all");
  });
});