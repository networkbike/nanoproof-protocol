import Link from "next/link";
import { Coins, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { analytics } from "@/lib/analytics-client";
import { formatCount, formatUsdCompact } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CreatorsDirectoryPage() {
  const [creators, topCreators] = await Promise.all([
    analytics.creators(100),
    analytics.topCreators(10),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Creators</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatCount(creators.data.length)} creators registered. Click any creator to see their analytics.
        </p>
      </div>

      {/* Top earners podium */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-4 w-4 text-emerald-500" />
            Top earners
          </CardTitle>
          <CardDescription>The 10 highest-grossing creators across all sources.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {topCreators.map((c, i) => (
              <li key={c.creatorId} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Badge variant={i === 0 ? "default" : "secondary"}>#{i + 1}</Badge>
                  <Link href={`/dashboard/creator/${c.creatorId}`} className="text-sm font-medium hover:underline">
                    @{c.username}
                  </Link>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{c.name}</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-semibold">${formatUsdCompact(c.earnedAtomic)}</span>
                  <span className="text-xs text-muted-foreground">{formatCount(c.citationCount)} cites</span>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Full directory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-indigo-500" />
            Directory
          </CardTitle>
          <CardDescription>Ordered by reputation score</CardDescription>
        </CardHeader>
        <CardContent>
          {creators.data.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No creators yet. Click "Load demo dataset" in the sidebar to populate.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-3 py-2">Creator</th>
                    <th className="px-3 py-2 text-right">Citations</th>
                    <th className="px-3 py-2 text-right">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {creators.data.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-muted/40">
                      <td className="px-3 py-2">
                        <Link href={`/dashboard/creator/${c.id}`} className="font-medium hover:underline">
                          {c.name}{" "}
                          <span className="text-xs text-muted-foreground">@{c.username}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCount(c.citationCount)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        ${formatUsdCompact(c.earnedAtomic)}
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