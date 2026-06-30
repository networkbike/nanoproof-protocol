import { headers } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Creator {
  id: string;
  username: string;
  name: string;
  reputationScore: number;
}

interface Source {
  id: string;
  url: string;
  title: string;
  status: string;
  citationCount: number;
  earnedAtomic: string;
}

interface Citation {
  id: string;
  snippet: string;
  kind: string;
  payoutAmountUsdc: string;
  recordedAt: string;
}

interface Payment {
  id: string;
  amountUsdc: string;
  status: string;
  arcScanUrl: string | null;
  settledAt: string | null;
}

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const h = await headers();
    const cookie = h.get("cookie") ?? "";
    const res = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      headers: { cookie },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  // MVP: read the seeded "demo" creator by username.
  // Phase 4 swaps this for the auth'd creator from Clerk.
  const creator = await fetchJSON<Creator>("/v1/creators/demo");

  if (!creator) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-12 text-center">
        <h2 className="text-xl font-semibold">No creator profile yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Seed the demo creator with <code className="rounded bg-muted px-1.5 py-0.5">pnpm --filter @nanoproof/api db:seed</code>,
          or hit <code className="rounded bg-muted px-1.5 py-0.5">POST /v1/creators</code>.
        </p>
      </div>
    );
  }

  const [sources, citations, payments] = await Promise.all([
    fetchJSON<Source[]>(`/v1/sources?creatorId=${creator.id}`),
    fetchJSON<Citation[]>(`/v1/citations?creatorId=${creator.id}`),
    fetchJSON<Payment[]>(`/v1/payments?creatorId=${creator.id}`),
  ]);

  const totalEarned = (payments ?? [])
    .filter((p) => p.status === "SETTLED")
    .reduce((sum, p) => sum + BigInt(p.amountUsdc), 0n);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {creator.name}</h1>
          <p className="text-sm text-muted-foreground">@{creator.username} · reputation {creator.reputationScore}</p>
        </div>
        <a
          href="/simulate"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Run simulation
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Sources" value={String(sources?.length ?? 0)} />
        <Stat label="Citations" value={String(citations?.length ?? 0)} />
        <Stat label="Total earned" value={`${(Number(totalEarned) / 1_000_000).toFixed(4)} USDC`} />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Sources</h2>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">URL</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Citations</th>
                <th className="p-3 text-right">Earned</th>
              </tr>
            </thead>
            <tbody>
              {(sources ?? []).map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">{s.title}</td>
                  <td className="p-3 text-muted-foreground">{s.url}</td>
                  <td className="p-3">{s.status}</td>
                  <td className="p-3 text-right">{s.citationCount}</td>
                  <td className="p-3 text-right">{(Number(s.earnedAtomic) / 1_000_000).toFixed(4)} USDC</td>
                </tr>
              ))}
              {(sources ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No sources registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent payments</h2>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Settled</th>
                <th className="p-3">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{(Number(p.amountUsdc) / 1_000_000).toFixed(4)} USDC</td>
                  <td className="p-3">{p.status}</td>
                  <td className="p-3 text-muted-foreground">{p.settledAt ?? "—"}</td>
                  <td className="p-3">
                    {p.arcScanUrl ? (
                      <a href={p.arcScanUrl} target="_blank" rel="noreferrer" className="underline">
                        View on ArcScan
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {(payments ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    No payments yet. Run a simulation to see one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}