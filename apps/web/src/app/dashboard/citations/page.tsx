import { Globe, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { analytics } from "@/lib/analytics-client";
import { formatCount, formatRelative, formatUsdCompact } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; limit?: string }>;
}) {
  const sp = await searchParams;
  const limit = Math.min(Math.max(Number(sp.limit ?? 50), 1), 200);
  const q = sp.q ?? "";

  const [citations, topSources, topDomains] = await Promise.all([
    analytics.citations({ q, limit }),
    analytics.topSources(10),
    analytics.topDomains(10),
    analytics.citationTimeline("30d"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Citations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatCount(citations.total)} total citations
            {q && (
              <>
                {" "}matching <span className="font-mono text-foreground">&quot;{q}&quot;</span>
              </>
            )}
          </p>
        </div>
        <form action="/dashboard/citations" method="get" className="flex items-center gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search snippets…"
            className="h-9 w-64 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Search
          </button>
        </form>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-indigo-500" />
              Top referenced domains
            </CardTitle>
            <CardDescription>Aggregated by source URL hostname</CardDescription>
          </CardHeader>
          <CardContent>
            {topDomains.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No citations yet.</p>
            ) : (
              <ol className="space-y-2">
                {topDomains.map((d, i) => (
                  <li key={d.domain} className="flex items-center gap-3 text-sm">
                    <span className="w-5 text-right font-mono text-xs text-muted-foreground">{i + 1}</span>
                    <span className="flex-1 truncate font-medium">{d.domain}</span>
                    <Badge variant="secondary">{formatCount(d.citationCount)} cites</Badge>
                    <span className="w-32 text-right text-xs text-muted-foreground">
                      {formatCount(d.uniqueSources)} sources
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-purple-500" />
              Top sources
            </CardTitle>
            <CardDescription>Most-cited individual sources</CardDescription>
          </CardHeader>
          <CardContent>
            {topSources.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No citations yet.</p>
            ) : (
              <ol className="space-y-2">
                {topSources.map((s, i) => (
                  <li key={s.sourceId} className="flex items-center gap-3 text-sm">
                    <span className="w-5 text-right font-mono text-xs text-muted-foreground">{i + 1}</span>
                    <span className="flex-1 truncate">
                      <span className="font-medium">{s.title ?? s.url}</span>
                      <span className="ml-1 text-xs text-muted-foreground">@{s.creatorUsername}</span>
                    </span>
                    <Badge variant="secondary">{formatCount(s.citationCount)}</Badge>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Citation list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Citations</CardTitle>
          <CardDescription>
            Showing {citations.data.length} of {formatCount(citations.total)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {citations.data.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No citations match.</p>
          ) : (
            <ul className="divide-y">
              {citations.data.map((c) => (
                <li key={c.id} className="py-3">
                  <p className="text-sm">{c.snippet}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{c.kind}</Badge>
                    {c.domain && <span>· {c.domain}</span>}
                    {c.sourceTitle && (
                      <>
                        · <span className="truncate">{c.sourceTitle}</span>
                      </>
                    )}
                    · <span>@{c.creatorUsername}</span>
                    · <span className="font-medium text-foreground">${formatUsdCompact(c.payoutAmountUsdc)}</span>
                    · {formatRelative(c.recordedAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}