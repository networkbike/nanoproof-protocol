import { Suspense } from "react";
import { Activity, BarChart3, CircleDollarSign, Coins, FileText, Layers, TrendingUp, Users, Wallet, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { analytics } from "@/lib/analytics-client";
import { formatCount, formatPct, formatUsdCompact } from "@/lib/utils";
import { CitationTimelineChart } from "@/components/dashboard/citation-timeline-chart";
import { PaymentStatusDonut } from "@/components/dashboard/payment-status-donut";

// =============================================================================
// /dashboard — Overview
//
// The hero page. Shows the protocol KPI strip + two trend charts. Designed
// for the Lepton demo: it answers "what is NanoProof?" at a glance.
// =============================================================================

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  // Fetch in parallel — each endpoint is small (10-50ms on a hot server).
  const [overview, citationTs, payments, topSources] = await Promise.all([
    analytics.overview(),
    analytics.citationTimeline("30d"),
    analytics.payments({ limit: 0 }), // for status breakdown only
    analytics.topSources(5),
  ]);

  const settledShare = payments.totalsByStatus.SETTLED / Math.max(overview.payments, 1);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Protocol overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The NanoProof creator economy at a glance — citations, attribution, payments, settlement.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Users className="h-4 w-4" />}
          label="Creators"
          value={formatCount(overview.creators)}
          delta={`${overview.recent.citations7d} citations / 7d`}
          href="/dashboard/creators"
        />
        <Kpi
          icon={<FileText className="h-4 w-4" />}
          label="Citations"
          value={formatCount(overview.citations)}
          delta={`${formatCount(overview.recent.citations24h)} in 24h`}
          href="/dashboard/citations"
        />
        <Kpi
          icon={<Coins className="h-4 w-4" />}
          label="Payments"
          value={formatCount(overview.payments)}
          delta={`${formatCount(overview.settledPayments)} settled`}
          href="/dashboard/payments"
        />
        <Kpi
          icon={<CircleDollarSign className="h-4 w-4" />}
          label="USDC settled"
          value={formatUsdCompact(overview.totalUsdcDistributed)}
          delta={`${formatUsdCompact(overview.pendingUsdc)} pending`}
          href="/dashboard/payments"
        />
      </div>

      {/* Story strip: the NanoProof flow Creator → Citation → Attribution → Payment → Settlement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-amber-500" />
            How NanoProof works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-center sm:grid-cols-5">
            <FlowStep icon={<Users className="h-5 w-5" />} title="Creator" subtitle="Registers source" />
            <Arrow />
            <FlowStep icon={<FileText className="h-5 w-5" />} title="Citation" subtitle="AI cites the source" />
            <Arrow />
            <FlowStep icon={<Layers className="h-5 w-5" />} title="Attribution" subtitle="Matched & scored" />
            <Arrow />
            <FlowStep icon={<Wallet className="h-5 w-5" />} title="Payment" subtitle="USDC minted to creator" />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <Badge variant="success">{formatPct(settledShare)} settled</Badge>
            <span>·</span>
            <span>Last updated {new Date(overview.generatedAt).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-indigo-500" />
              Citations over 30 days
            </CardTitle>
            <CardDescription>{formatCount(citationTs.total)} citations total</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-64 animate-pulse rounded bg-muted" />}>
              <CitationTimelineChart data={citationTs.buckets} />
            </Suspense>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Payment status
            </CardTitle>
            <CardDescription>Across all {formatCount(overview.payments)} payments</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentStatusDonut counts={payments.totalsByStatus} />
          </CardContent>
        </Card>
      </div>

      {/* Top sources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-purple-500" />
            Top cited sources
          </CardTitle>
          <CardDescription>Across all creators and networks</CardDescription>
        </CardHeader>
        <CardContent>
          {topSources.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No citations yet. Load the demo dataset to populate the dashboard.
            </p>
          ) : (
            <ol className="divide-y">
              {topSources.map((s, i) => (
                <li key={s.sourceId} className="flex items-center gap-4 py-3">
                  <span className="w-6 text-right text-sm font-mono text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {s.title ?? s.url}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      <a className="hover:underline" href={`/dashboard/creator/${s.creatorId}`}>
                        @{s.creatorUsername}
                      </a>{" "}
                      · {new URL(s.url).hostname}
                    </p>
                  </div>
                  <Badge variant="secondary">{formatCount(s.citationCount)} cites</Badge>
                  <span className="w-20 text-right text-sm font-medium">
                    ${formatUsdCompact(s.earnedAtomic)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function Kpi({
  icon,
  label,
  value,
  delta,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group block rounded-lg border bg-card p-4 transition-colors hover:border-indigo-200 hover:bg-indigo-50/30 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20"
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">{icon} {label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{delta}</p>
    </a>
  );
}

function FlowStep({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow">
        {icon}
      </div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="hidden text-muted-foreground sm:block">
      <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
        <path d="M0 6h20m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}