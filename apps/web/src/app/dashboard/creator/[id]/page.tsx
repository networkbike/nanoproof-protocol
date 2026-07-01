import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CircleDollarSign,
  Coins,
  ExternalLink,
  FileText,
  Layers,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { analytics } from "@/lib/analytics-client";
import { formatCount, formatRelative, formatUsdCompact, truncateAddress } from "@/lib/utils";
import { CitationTimelineChart } from "@/components/dashboard/citation-timeline-chart";

export const dynamic = "force-dynamic";

export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let creator;
  try {
    creator = await analytics.creator(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/creators" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" />
          All creators
        </Link>
      </div>

      {/* Profile header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-semibold text-white shadow">
              {creator.creator.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{creator.creator.name}</h1>
                <Badge variant={creator.creator.isActive ? "success" : "secondary"}>
                  {creator.creator.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline">Reputation {creator.creator.reputationScore}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">@{creator.creator.username}</p>
              {creator.creator.bio && (
                <p className="mt-2 max-w-2xl text-sm">{creator.creator.bio}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Joined {new Date(creator.creator.createdAt).toLocaleDateString()}
              </p>
            </div>
            {creator.wallet && (
              <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs">
                <div className="flex items-center gap-1.5 font-medium">
                  <Wallet className="h-3.5 w-3.5" />
                  {creator.wallet.network}
                </div>
                <div className="mt-1 font-mono">
                  <Link
                    href={`https://testnet.arcscan.app/address/${creator.wallet.address}`}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    {truncateAddress(creator.wallet.address)} <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <div className="mt-1 inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-3 w-3" />
                  {creator.wallet.verificationStatus}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Mini icon={<FileText className="h-4 w-4" />} label="Sources" value={formatCount(creator.counts.sources)} />
        <Mini icon={<Layers className="h-4 w-4" />} label="Citations" value={formatCount(creator.counts.citations)} />
        <Mini
          icon={<CircleDollarSign className="h-4 w-4" />}
          label="Total earnings"
          value={`$${formatUsdCompact(creator.earnings.totalAtomic)}`}
        />
        <Mini
          icon={<Coins className="h-4 w-4" />}
          label="Settled"
          value={`$${formatUsdCompact(creator.earnings.settledAtomic)}`}
          tone="emerald"
        />
        <Mini
          icon={<Coins className="h-4 w-4" />}
          label="Pending"
          value={`$${formatUsdCompact(creator.earnings.pendingAtomic)}`}
          tone="amber"
        />
      </div>

      {/* Citation timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Citations over 30 days</CardTitle>
          <CardDescription>{formatCount(creator.citationTimeSeries.total)} citations total</CardDescription>
        </CardHeader>
        <CardContent>
          <CitationTimelineChart data={creator.citationTimeSeries.buckets} />
        </CardContent>
      </Card>

      {/* Top sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top sources</CardTitle>
          <CardDescription>Ranked by citation count</CardDescription>
        </CardHeader>
        <CardContent>
          {creator.topSources.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No sources yet.</p>
          ) : (
            <ol className="divide-y">
              {creator.topSources.map((s, i) => (
                <li key={s.sourceId} className="flex items-center gap-3 py-3">
                  <span className="w-5 text-right text-sm font-mono text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.title ?? s.url}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.url}</p>
                  </div>
                  <Badge variant="secondary">{formatCount(s.citationCount)} cites</Badge>
                  <span className="w-20 text-right text-sm">${formatUsdCompact(s.earnedAtomic)}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Recent citations + payments */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent citations</CardTitle>
            <CardDescription>Last 10 cited by AI agents</CardDescription>
          </CardHeader>
          <CardContent>
            {creator.recentCitations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No citations yet.</p>
            ) : (
              <ul className="space-y-3">
                {creator.recentCitations.map((c) => (
                  <li key={c.id} className="rounded-md border p-3 text-xs">
                    <p className="text-sm">{c.snippet}</p>
                    <p className="mt-1 text-muted-foreground">
                      {c.kind} · {c.domain} · ${formatUsdCompact(c.payoutAmountUsdc)} ·{" "}
                      {formatRelative(c.recordedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent payments</CardTitle>
            <CardDescription>Last 10 payments</CardDescription>
          </CardHeader>
          <CardContent>
            {creator.recentPayments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              <ul className="space-y-3">
                {creator.recentPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-xs">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">${formatUsdCompact(p.amountUsdc)}</p>
                      <p className="text-muted-foreground">
                        {p.status} · {formatRelative(p.createdAt)}
                      </p>
                    </div>
                    {p.arcScanUrl && (
                      <Link href={p.arcScanUrl} className="text-xs text-indigo-600 hover:underline">
                        View tx <ExternalLink className="inline h-3 w-3" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Mini({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "emerald" | "amber";
}) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "amber"
        ? "text-amber-700 dark:text-amber-400"
        : "";
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${toneCls}`}>{value}</p>
    </div>
  );
}