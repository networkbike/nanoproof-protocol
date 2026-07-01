import { ExternalLink, Coins, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { analytics } from "@/lib/analytics-client";
import { formatCount, formatRelative, formatUsdCompact } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const [list, overview] = await Promise.all([
    analytics.payments({ limit: 100 }),
    analytics.overview(),
  ]);

  const settledTotal = BigInt(list.totalUsdcByStatus.SETTLED);
  const pendingTotal = BigInt(list.totalUsdcByStatus.PENDING);
  const failedTotal = BigInt(list.totalUsdcByStatus.FAILED);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatCount(list.totalsByStatus.SETTLED)} settled of {formatCount(overview.payments)} total
        </p>
      </div>

      {/* Status summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatusCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="success"
          label="Settled"
          count={list.totalsByStatus.SETTLED}
          amount={list.totalUsdcByStatus.SETTLED}
        />
        <StatusCard
          icon={<Loader2 className="h-4 w-4" />}
          tone="warning"
          label="Pending"
          count={list.totalsByStatus.PENDING}
          amount={list.totalUsdcByStatus.PENDING}
        />
        <StatusCard
          icon={<Coins className="h-4 w-4" />}
          tone="default"
          label="Quoted"
          count={list.totalsByStatus.QUOTED}
          amount={list.totalUsdcByStatus.QUOTED}
        />
        <StatusCard
          icon={<Coins className="h-4 w-4" />}
          tone="default"
          label="Capped"
          count={list.totalsByStatus.CAPPED}
          amount={list.totalUsdcByStatus.CAPPED}
        />
        <StatusCard
          icon={<AlertCircle className="h-4 w-4" />}
          tone="destructive"
          label="Failed"
          count={list.totalsByStatus.FAILED}
          amount={list.totalUsdcByStatus.FAILED}
        />
      </div>

      {/* Big total */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total settled</p>
              <p className="mt-1 text-3xl font-semibold text-emerald-700 dark:text-emerald-400">
                ${formatUsdCompact(settledTotal)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending</p>
              <p className="mt-1 text-3xl font-semibold text-amber-700 dark:text-amber-400">
                ${formatUsdCompact(pendingTotal)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Failed</p>
              <p className="mt-1 text-3xl font-semibold text-red-700 dark:text-red-400">
                ${formatUsdCompact(failedTotal)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent payments</CardTitle>
          <CardDescription>Showing the latest {list.data.length} payments</CardDescription>
        </CardHeader>
        <CardContent>
          {list.data.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-3 py-2">Creator</th>
                    <th className="px-3 py-2">Network</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2 text-right">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-muted/40">
                      <td className="px-3 py-2 font-medium">@{p.creatorUsername}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{p.network}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        ${formatUsdCompact(p.amountUsdc)}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {p.settledAt ? formatRelative(p.settledAt) : formatRelative(p.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {p.arcScanUrl ? (
                          <a
                            href={p.arcScanUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({
  icon,
  tone,
  label,
  count,
  amount,
}: {
  icon: React.ReactNode;
  tone: "default" | "success" | "warning" | "destructive";
  label: string;
  count: number;
  amount: string;
}) {
  const toneCls =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"
        : tone === "destructive"
          ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20"
          : "";
  return (
    <div className={`rounded-lg border p-3 ${toneCls}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums">{formatCount(count)}</p>
      <p className="text-xs text-muted-foreground">${formatUsdCompact(amount)}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "SETTLED"
      ? "success"
      : status === "PENDING"
        ? "warning"
        : status === "FAILED"
          ? "destructive"
          : "secondary";
  return <Badge variant={variant as never}>{status}</Badge>;
}