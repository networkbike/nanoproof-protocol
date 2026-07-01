// =============================================================================
// NanoProof — Analytics DTOs (Phase 6 — Creator Analytics Dashboard)
//
// All read-only. Consumed by apps/web (server components + client fetch) and
// the Lepton demo walkthrough. Schemas double as runtime validation for
// API responses and as TypeScript types via `z.infer`.
// =============================================================================

import { z } from "zod";

// -----------------------------------------------------------------------------
// Primitives
// -----------------------------------------------------------------------------

export const AtomicUsdcAmountSchema = z.string().regex(/^\d+$/, "amount must be atomic USDC integer string");

export const TimeRangeSchema = z.enum(["24h", "7d", "30d", "90d", "all"]);
export type TimeRange = z.infer<typeof TimeRangeSchema>;

export const BucketGranularitySchema = z.enum(["hour", "day", "week"]);
export type BucketGranularity = z.infer<typeof BucketGranularitySchema>;

// -----------------------------------------------------------------------------
// Overview — protocol-wide KPI strip
// -----------------------------------------------------------------------------

export const OverviewKpiSchema = z.object({
  creators: z.number().int().nonnegative(),
  sources: z.number().int().nonnegative(),
  citations: z.number().int().nonnegative(),
  attributionEvents: z.number().int().nonnegative(),
  payments: z.number().int().nonnegative(),
  pendingPayments: z.number().int().nonnegative(),
  settledPayments: z.number().int().nonnegative(),
  totalUsdcDistributed: AtomicUsdcAmountSchema, // atomic USDC, sum across SETTLED
  pendingUsdc: AtomicUsdcAmountSchema,
  // activity in the trailing 24h / 7d for the "delta" badge
  recent: z.object({
    citations24h: z.number().int().nonnegative(),
    citations7d: z.number().int().nonnegative(),
    payments24h: z.number().int().nonnegative(),
    usdcSettled24h: AtomicUsdcAmountSchema,
  }),
  generatedAt: z.string(),
});
export type OverviewKpi = z.infer<typeof OverviewKpiSchema>;

// -----------------------------------------------------------------------------
// Time series — bucketed counts over time
// -----------------------------------------------------------------------------

export const TimeBucketSchema = z.object({
  // ISO 8601 timestamp at the bucket boundary (start of hour/day/week)
  bucket: z.string(),
  // The bucket's span in milliseconds (helps the UI label buckets)
  spanMs: z.number().int().positive(),
  count: z.number().int().nonnegative(),
});
export type TimeBucket = z.infer<typeof TimeBucketSchema>;

export const CitationTimeSeriesSchema = z.object({
  range: TimeRangeSchema,
  granularity: BucketGranularitySchema,
  buckets: z.array(TimeBucketSchema),
  total: z.number().int().nonnegative(),
});
export type CitationTimeSeries = z.infer<typeof CitationTimeSeriesSchema>;

// -----------------------------------------------------------------------------
// Top lists
// -----------------------------------------------------------------------------

export const TopSourceSchema = z.object({
  sourceId: z.string(),
  creatorId: z.string(),
  creatorUsername: z.string(),
  url: z.string(),
  title: z.string().nullable(),
  citationCount: z.number().int().nonnegative(),
  earnedAtomic: AtomicUsdcAmountSchema,
});
export type TopSource = z.infer<typeof TopSourceSchema>;

export const TopDomainSchema = z.object({
  domain: z.string(),
  citationCount: z.number().int().nonnegative(),
  uniqueSources: z.number().int().nonnegative(),
});
export type TopDomain = z.infer<typeof TopDomainSchema>;

export const TopCreatorSchema = z.object({
  creatorId: z.string(),
  username: z.string(),
  name: z.string(),
  citationCount: z.number().int().nonnegative(),
  earnedAtomic: AtomicUsdcAmountSchema,
  sourceCount: z.number().int().nonnegative(),
});
export type TopCreator = z.infer<typeof TopCreatorSchema>;

// -----------------------------------------------------------------------------
// Citation search / listing
// -----------------------------------------------------------------------------

export const CitationListQuerySchema = z.object({
  q: z.string().min(1).max(100).optional(),
  creatorId: z.string().optional(),
  sourceId: z.string().optional(),
  kind: z.enum(["DIRECT", "INDIRECT", "SUPPORTING", "REFERENCE", "CONTEXT"]).optional(),
  // ISO timestamp lower bound (inclusive)
  since: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(25),
  cursor: z.string().optional(),
});
export type CitationListQuery = z.infer<typeof CitationListQuerySchema>;

export const CitationListItemSchema = z.object({
  id: z.string(),
  snippet: z.string(),
  kind: z.string(),
  domain: z.string().nullable(),
  url: z.string().nullable(),
  creatorId: z.string(),
  creatorUsername: z.string(),
  sourceId: z.string().nullable(),
  sourceTitle: z.string().nullable(),
  payoutAmountUsdc: AtomicUsdcAmountSchema,
  recordedAt: z.string(),
});
export type CitationListItem = z.infer<typeof CitationListItemSchema>;

export const CitationListResponseSchema = z.object({
  data: z.array(CitationListItemSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type CitationListResponse = z.infer<typeof CitationListResponseSchema>;

// -----------------------------------------------------------------------------
// Payments
// -----------------------------------------------------------------------------

export const PaymentListQuerySchema = z.object({
  creatorId: z.string().optional(),
  status: z.enum(["PENDING", "QUOTED", "SETTLED", "CAPPED", "FAILED"]).optional(),
  since: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(25),
  cursor: z.string().optional(),
});
export type PaymentListQuery = z.infer<typeof PaymentListQuerySchema>;

export const PaymentListItemSchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  creatorUsername: z.string(),
  amountUsdc: AtomicUsdcAmountSchema,
  status: z.string(),
  network: z.string(),
  txHash: z.string().nullable(),
  arcScanUrl: z.string().nullable(),
  settledAt: z.string().nullable(),
  createdAt: z.string(),
});
export type PaymentListItem = z.infer<typeof PaymentListItemSchema>;

export const PaymentListResponseSchema = z.object({
  data: z.array(PaymentListItemSchema),
  nextCursor: z.string().nullable(),
  totalsByStatus: z.object({
    PENDING: z.number().int().nonnegative(),
    QUOTED: z.number().int().nonnegative(),
    SETTLED: z.number().int().nonnegative(),
    CAPPED: z.number().int().nonnegative(),
    FAILED: z.number().int().nonnegative(),
  }),
  totalUsdcByStatus: z.object({
    PENDING: AtomicUsdcAmountSchema,
    QUOTED: AtomicUsdcAmountSchema,
    SETTLED: AtomicUsdcAmountSchema,
    CAPPED: AtomicUsdcAmountSchema,
    FAILED: AtomicUsdcAmountSchema,
  }),
});
export type PaymentListResponse = z.infer<typeof PaymentListResponseSchema>;

// -----------------------------------------------------------------------------
// Creator — single-creator deep view
// -----------------------------------------------------------------------------

export const CreatorAnalyticsSchema = z.object({
  creator: z.object({
    id: z.string(),
    username: z.string(),
    name: z.string(),
    bio: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    reputationScore: z.number().int(),
    isActive: z.boolean(),
    createdAt: z.string(),
  }),
  wallet: z
    .object({
      address: z.string(),
      network: z.string(),
      verificationStatus: z.string(),
      verifiedAt: z.string().nullable(),
    })
    .nullable(),
  counts: z.object({
    sources: z.number().int().nonnegative(),
    activeSources: z.number().int().nonnegative(),
    citations: z.number().int().nonnegative(),
    attributionEvents: z.number().int().nonnegative(),
    payments: z.number().int().nonnegative(),
  }),
  earnings: z.object({
    totalAtomic: AtomicUsdcAmountSchema,
    pendingAtomic: AtomicUsdcAmountSchema,
    settledAtomic: AtomicUsdcAmountSchema,
  }),
  topSources: z.array(TopSourceSchema).max(10),
  recentCitations: z.array(CitationListItemSchema).max(10),
  recentPayments: z.array(PaymentListItemSchema).max(10),
  citationTimeSeries: CitationTimeSeriesSchema,
  generatedAt: z.string(),
});
export type CreatorAnalytics = z.infer<typeof CreatorAnalyticsSchema>;

// -----------------------------------------------------------------------------
// Protocol — macro metrics for the investor/judge view
// -----------------------------------------------------------------------------

export const ProtocolAnalyticsSchema = z.object({
  counts: z.object({
    creators: z.number().int().nonnegative(),
    sources: z.number().int().nonnegative(),
    citations: z.number().int().nonnegative(),
    payments: z.number().int().nonnegative(),
  }),
  economics: z.object({
    totalUsdc: AtomicUsdcAmountSchema,
    avgPaymentAtomic: AtomicUsdcAmountSchema,
    medianPaymentAtomic: AtomicUsdcAmountSchema,
  }),
  attribution: z.object({
    avgScore: z.number().min(0).max(1),
    medianScore: z.number().min(0).max(1),
  }),
  health: z.object({
    activeCreatorShare: z.number().min(0).max(1), // % of creators with >= 1 citation
    settiledShare: z.number().min(0).max(1), // % of payments SETTLED vs total
    uniqueDomainsCited: z.number().int().nonnegative(),
  }),
  citationTimeSeries: CitationTimeSeriesSchema,
  paymentTimeSeries: CitationTimeSeriesSchema, // same shape, payment counts
  generatedAt: z.string(),
});
export type ProtocolAnalytics = z.infer<typeof ProtocolAnalyticsSchema>;

// -----------------------------------------------------------------------------
// Creators list — creator directory for the dashboard sidebar
// -----------------------------------------------------------------------------

export const CreatorListItemSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  citationCount: z.number().int().nonnegative(),
  earnedAtomic: AtomicUsdcAmountSchema,
});
export type CreatorListItem = z.infer<typeof CreatorListItemSchema>;

export const CreatorListResponseSchema = z.object({
  data: z.array(CreatorListItemSchema),
  generatedAt: z.string(),
});
export type CreatorListResponse = z.infer<typeof CreatorListResponseSchema>;

// -----------------------------------------------------------------------------
// Demo mode — seeds a deterministic dataset for live presentations.
// Returns a summary so the UI can show "Seeded N rows" toast.
// -----------------------------------------------------------------------------

export const DemoSeedResultSchema = z.object({
  ok: z.boolean(),
  seeded: z.object({
    creators: z.number().int().nonnegative(),
    sources: z.number().int().nonnegative(),
    citations: z.number().int().nonnegative(),
    attributionEvents: z.number().int().nonnegative(),
    payments: z.number().int().nonnegative(),
  }),
  durationMs: z.number().int().nonnegative(),
  generatedAt: z.string(),
});
export type DemoSeedResult = z.infer<typeof DemoSeedResultSchema>;