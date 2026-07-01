import { Activity, BarChart3, CircleDollarSign, FileText, Gauge, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { analytics } from "@/lib/analytics-client";
import { formatCount, formatPct, formatUsdCompact } from "@/lib/utils";
import { CitationTimelineChart } from "@/components/dashboard/citation-timeline-chart";

export const dynamic = "force-dynamic";

export default async function ProtocolPage() {
  const p = await analytics.protocol();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Protocol</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Macro view of the NanoProof network — adoption, throughput, attribution quality.
        </p>
      </div>

      {/* Counts strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Users className="h-4 w-4" />} label="Creators" value={formatCount(p.counts.creators)} />
        <Kpi icon={<FileText className="h-4 w-4" />} label="Sources" value={formatCount(p.counts.sources)} />
        <Kpi icon={<Activity className="h-4 w-4" />} label="Citations" value={formatCount(p.counts.citations)} />
        <Kpi icon={<CircleDollarSign className="h-4 w-4" />} label="Payments" value={formatCount(p.counts.payments)} />
      </div>

      {/* Economics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Economics
          </CardTitle>
          <CardDescription>USDC throughput (atomic, bigint-precision)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total settled</p>
              <p className="mt-1 text-3xl font-semibold">${formatUsdCompact(p.economics.totalUsdc)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Avg payment</p>
              <p className="mt-1 text-3xl font-semibold">${formatUsdCompact(p.economics.avgPaymentAtomic)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Median payment</p>
              <p className="mt-1 text-3xl font-semibold">${formatUsdCompact(p.economics.medianPaymentAtomic)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4 text-indigo-500" />
            Health metrics
          </CardTitle>
          <CardDescription>Adoption, settlement, attribution quality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Health label="Active creators" pct={p.health.activeCreatorShare} help="% with ≥ 1 citation" />
            <Health label="Settlement rate" pct={p.health.settiledShare} help="% of payments SETTLED" tone="emerald" />
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Avg attribution score</p>
              <p className="mt-1 text-2xl font-semibold">{p.attribution.avgScore.toFixed(3)}</p>
              <p className="mt-1 text-xs text-muted-foreground">0 = weak, 1 = strong</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Median attribution</p>
              <p className="mt-1 text-2xl font-semibold">{p.attribution.medianScore.toFixed(3)}</p>
              <p className="mt-1 text-xs text-muted-foreground">50th percentile</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-purple-500" />
            Citation volume over 30 days
          </CardTitle>
          <CardDescription>{formatCount(p.citationTimeSeries.total)} citations total</CardDescription>
        </CardHeader>
        <CardContent>
          <CitationTimelineChart data={p.citationTimeSeries.buckets} />
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Health({
  label,
  pct,
  help,
  tone = "default",
}: {
  label: string;
  pct: number;
  help: string;
  tone?: "default" | "emerald";
}) {
  const pctColor = tone === "emerald" ? "bg-emerald-500" : "bg-indigo-500";
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{formatPct(pct)}</p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${pctColor}`} style={{ width: `${Math.min(100, pct * 100)}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{help}</p>
    </div>
  );
}