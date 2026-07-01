// =============================================================================
// NanoProof — Analytics Controller (Phase 6)
//
// All routes are mounted under /v1/analytics and require a valid API key
// (the global APP_GUARD handles auth). Per-route scopes follow the same
// pattern as the rest of the api (READ_CITATIONS + READ_PAYMENTS).
//
// Endpoints:
//   GET  /v1/analytics/overview             — protocol KPI strip
//   GET  /v1/analytics/creators             — creator directory (top by rep)
//   GET  /v1/analytics/citations            — paginated citations list
//   GET  /v1/analytics/citations/top-sources
//   GET  /v1/analytics/citations/top-domains
//   GET  /v1/analytics/citations/timeline?range=24h|7d|30d|90d|all
//   GET  /v1/analytics/payments             — paginated payments list
//   GET  /v1/analytics/payments/timeline?range=...
//   GET  /v1/analytics/top-creators
//   GET  /v1/analytics/creator/:id          — single creator deep view
//   GET  /v1/analytics/protocol             — protocol-wide macro metrics
//   POST /v1/analytics/demo/seed            — populate demo dataset
// =============================================================================

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from "@nestjs/swagger";
import { ApiKeyScope } from "@prisma/client";
import { z } from "zod";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { NPError } from "../../common/errors/np.error.js";
import {
  ApiKeyGuard,
  CurrentPrincipal,
  Public,
  RequireScopes,
  type Principal,
} from "../../common/decorators/index.js";
import {
  CitationListQuerySchema,
  PaymentListQuerySchema,
  TimeRangeSchema,
  type CitationListResponse,
  type CreatorAnalytics,
  type CreatorListResponse,
  type DemoSeedResult,
  type OverviewKpi,
  type PaymentListResponse,
  type ProtocolAnalytics,
  type CitationTimeSeries,
  type TopSource,
  type TopDomain,
  type TopCreator,
} from "@nanoproof/shared/schemas/analytics";
import { AnalyticsService } from "./analytics.service.js";

// Schema is hoisted so the @Body() decorator below can resolve it during
// class evaluation (decorators run before the class body).
const DemoSeedBodySchema = z
  .object({
    creators: z.number().int().min(1).max(1000).optional(),
    sources: z.number().int().min(1).max(5000).optional(),
    citations: z.number().int().min(1).max(20000).optional(),
    payments: z.number().int().min(1).max(20000).optional(),
  })
  .optional();

@ApiTags("analytics")
@ApiProduces("application/json")
@Controller("v1/analytics")
@UseGuards(ApiKeyGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  // ---------------------------------------------------------------------------
  // Overview — protocol KPI strip
  // ---------------------------------------------------------------------------
  @Get("overview")
  @RequireScopes(ApiKeyScope.READ_CITATIONS, ApiKeyScope.READ_PAYMENTS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "Protocol-wide KPI strip", operationId: "analyticsOverview" })
  overview(): Promise<OverviewKpi> {
    return this.analytics.overview();
  }

  // ---------------------------------------------------------------------------
  // Creators list — for the sidebar / directory
  // ---------------------------------------------------------------------------
  @Get("creators")
  @RequireScopes(ApiKeyScope.READ_CITATIONS, ApiKeyScope.READ_PAYMENTS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "Creator directory, ordered by reputation", operationId: "analyticsCreators" })
  creators(@Query("limit") limit?: string): Promise<CreatorListResponse> {
    const n = limit ? Math.min(Math.max(Number(limit) || 25, 1), 200) : 25;
    return this.analytics.creatorsList(n);
  }

  // ---------------------------------------------------------------------------
  // Top creators — earnings leaderboard
  // ---------------------------------------------------------------------------
  @Get("top-creators")
  @RequireScopes(ApiKeyScope.READ_CITATIONS, ApiKeyScope.READ_PAYMENTS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "Top creators by earnings", operationId: "analyticsTopCreators" })
  topCreators(@Query("limit") limit?: string): Promise<TopCreator[]> {
    const n = limit ? Math.min(Math.max(Number(limit) || 10, 1), 100) : 10;
    return this.analytics.topCreators(n);
  }

  // ---------------------------------------------------------------------------
  // Single creator deep view
  // ---------------------------------------------------------------------------
  @Get("creator/:id")
  @RequireScopes(ApiKeyScope.READ_CITATIONS, ApiKeyScope.READ_PAYMENTS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "Single creator analytics", operationId: "analyticsCreatorDetail" })
  creatorDetail(@Param("id") id: string): Promise<CreatorAnalytics> {
    return this.analytics.creatorDetail(id);
  }

  // ---------------------------------------------------------------------------
  // Citations — list + top + timeline
  // ---------------------------------------------------------------------------
  @Get("citations")
  @RequireScopes(ApiKeyScope.READ_CITATIONS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "Paginated citation list with search", operationId: "analyticsCitations" })
  citations(
    @Query(new ZodValidationPipe(CitationListQuerySchema, "query"))
    q: import("@nanoproof/shared/schemas/analytics").CitationListQuery,
  ): Promise<CitationListResponse> {
    return this.analytics.citations(q);
  }

  @Get("citations/top-sources")
  @RequireScopes(ApiKeyScope.READ_CITATIONS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "Top cited sources", operationId: "analyticsTopSources" })
  topSources(@Query("limit") limit?: string): Promise<TopSource[]> {
    const n = limit ? Math.min(Math.max(Number(limit) || 10, 1), 100) : 10;
    return this.analytics.topSources(n);
  }

  @Get("citations/top-domains")
  @RequireScopes(ApiKeyScope.READ_CITATIONS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "Top referenced domains", operationId: "analyticsTopDomains" })
  topDomains(@Query("limit") limit?: string): Promise<TopDomain[]> {
    const n = limit ? Math.min(Math.max(Number(limit) || 10, 1), 100) : 10;
    return this.analytics.topDomains(n);
  }

  @Get("citations/timeline")
  @RequireScopes(ApiKeyScope.READ_CITATIONS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "Citation volume time series", operationId: "analyticsCitationTimeline" })
  citationTimeline(@Query("range") range: string = "30d"): Promise<CitationTimeSeries> {
    const r = TimeRangeSchema.parse(range);
    return this.analytics.citationTimeSeries(r);
  }

  // ---------------------------------------------------------------------------
  // Payments
  // ---------------------------------------------------------------------------
  @Get("payments")
  @RequireScopes(ApiKeyScope.READ_PAYMENTS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "Paginated payment list with totals by status", operationId: "analyticsPayments" })
  payments(
    @Query(new ZodValidationPipe(PaymentListQuerySchema, "query"))
    q: import("@nanoproof/shared/schemas/analytics").PaymentListQuery,
  ): Promise<PaymentListResponse> {
    return this.analytics.payments(q);
  }

  @Get("payments/timeline")
  @RequireScopes(ApiKeyScope.READ_PAYMENTS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "Payment volume time series", operationId: "analyticsPaymentTimeline" })
  paymentTimeline(@Query("range") range: string = "30d"): Promise<CitationTimeSeries> {
    const r = TimeRangeSchema.parse(range);
    return this.analytics.paymentTimeSeries(r);
  }

  // ---------------------------------------------------------------------------
  // Protocol macro view
  // ---------------------------------------------------------------------------
  @Get("protocol")
  @RequireScopes(ApiKeyScope.READ_CITATIONS, ApiKeyScope.READ_PAYMENTS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "Protocol-wide macro analytics", operationId: "analyticsProtocol" })
  protocol(): Promise<ProtocolAnalytics> {
    return this.analytics.protocol();
  }

  // ---------------------------------------------------------------------------
  // Demo mode — populate deterministic dataset
  // ---------------------------------------------------------------------------
  @Post("demo/seed")
  @HttpCode(200)
  @RequireScopes(ApiKeyScope.ADMIN)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "Populate the dashboard with a deterministic demo dataset", operationId: "analyticsDemoSeed" })
  demoSeed(
    @Body(new ZodValidationPipe(DemoSeedBodySchema))
    body: { creators?: number; sources?: number; citations?: number; payments?: number } | undefined,
  ): Promise<DemoSeedResult> {
    if (process.env.NANOPROOF_DEMO_MODE !== "true") {
      throw new NPError("NP_FORBIDDEN", {
        message: "Demo mode disabled. Set NANOPROOF_DEMO_MODE=true on the server to enable.",
      });
    }
    return this.analytics.seedDemo(body ?? undefined);
  }
}