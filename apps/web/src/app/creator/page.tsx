"use client"
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
;

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Session {
  email: string;
  userId: string;
  expiresAt: string;
}

interface CreatorOverview {
  creator: { id: string; handle: string; displayName: string; walletAddress: string };
  revenue: {
    totalUsdcDisplay: string;
    totalUsdcRaw: string;
    settledPayments: number;
    uniqueSupporters: number;
    pendingPayments: number;
  };
  recentPayments: Array<{
    id: string;
    amountUsdc: string;
    status: string;
    createdAt: string;
    settledAt: string | null;
    txHash: string | null;
    resource: string;
    arcScanUrl: string | null;
  }>;
  recentProofs: Array<{
    id: string;
    paymentHash: string;
    arcScanUrl: string;
    verificationStatus: string;
    createdAt: string;
  }>;
}

export default function CreatorDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [overview, setOverview] = useState<CreatorOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("nanoproof-session");
    if (!stored) {
      router.push("/sign-in");
      return;
    }
    const s = JSON.parse(stored) as Session;
    setSession(s);

    loadOverview(s);
    const interval = setInterval(() => loadOverview(s), 12_000);
    return () => clearInterval(interval);
  }, [router]);

  async function loadOverview(s: Session) {
    try {
      // Pull demo creator metrics — in production this would scope to the
      // signed-in user's creatorId. Demo data uses cr_demo_alice.
      const r = await fetch("/api/creator/overview");
      if (!r.ok) throw new Error("Failed to load overview");
      setOverview(await r.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    localStorage.removeItem("nanoproof-session");
    router.push("/landing");
  }

  if (loading) {
    return <DashboardShell email="" onSignOut={signOut}><Skeleton /></DashboardShell>;
  }

  if (error && !overview) {
    return (
      <DashboardShell email={session?.email || ""} onSignOut={signOut}>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-900">
          Failed to load dashboard: {error}
        </div>
      </DashboardShell>
    );
  }

  if (!overview) return null;

  const c = overview.creator;
  const r = overview.revenue;

  return (
    <DashboardShell email={session?.email || ""} onSignOut={signOut}>
      {/* Welcome strip */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 text-white shadow-lg">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-indigo-100">Creator dashboard</div>
            <h1 className="mt-2 text-3xl font-bold">Welcome back, {c.displayName}</h1>
            <p className="mt-1 text-sm text-indigo-100">
              Handle: <code className="font-mono">@{c.handle}</code> · {c.walletAddress.slice(0, 10)}…{c.walletAddress.slice(-6)}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/demo"
              className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
            >
              Run demo
            </Link>
            <Link
              href="/payments"
              className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-slate-50"
            >
              New payment →
            </Link>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total revenue"
          value={`$${r.totalUsdcDisplay}`}
          sub={`${r.settledPayments} settled payments`}
          accent="emerald"
          icon="💰"
        />
        <KpiCard
          label="Unique supporters"
          value={r.uniqueSupporters.toString()}
          sub="Distinct payer addresses"
          accent="indigo"
          icon="👥"
        />
        <KpiCard
          label="Pending payments"
          value={r.pendingPayments.toString()}
          sub="Awaiting settlement"
          accent="amber"
          icon="⏳"
        />
        <KpiCard
          label="Avg per payment"
          value={r.settledPayments > 0 ? `$${(parseFloat(r.totalUsdcDisplay) / r.settledPayments).toFixed(6)}` : "$0"}
          sub="USDC per citation"
          accent="purple"
          icon="📊"
        />
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Quick actions</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/payments" emoji="💳" title="Create payment" body="Generate a new x402 payment request" />
          <QuickAction href="/payments?demo=1" emoji="⚡" title="Run x402 demo" body="Full lifecycle in 8 seconds" />
          <QuickAction href="/history" emoji="📜" title="View history" body="See all settlements and proofs" />
          <QuickAction href="/dashboard" emoji="📈" title="Analytics" body="Protocol-wide metrics" />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Recent payments */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent payments</h2>
            <Link href="/history" className="text-sm text-indigo-600 hover:text-indigo-500">View all →</Link>
          </div>
          {overview.recentPayments.length === 0 ? (
            <EmptyState
              emoji="💸"
              title="No payments yet"
              body="Run the x402 demo to see your first settlement."
            />
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {overview.recentPayments.slice(0, 5).map((p) => (
                <PaymentRow key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>

        {/* Recent proofs */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Settlement proofs</h2>
            <Link href="/history" className="text-sm text-indigo-600 hover:text-indigo-500">View all →</Link>
          </div>
          {overview.recentProofs.length === 0 ? (
            <EmptyState emoji="🔐" title="No proofs yet" body="Settlement proofs will appear after your first payment." />
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {overview.recentProofs.slice(0, 5).map((pr) => (
                <ProofRow key={pr.id} pr={pr} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity feed */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Activity feed</h2>
        <ActivityFeed payments={overview.recentPayments} proofs={overview.recentProofs} />
      </div>
    </DashboardShell>
  );
}

function DashboardShell({ email, onSignOut, children }: { email: string; onSignOut: () => void; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/landing" className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-slate-900">NanoProof</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <Link href="/creator" className="font-medium text-slate-900">Dashboard</Link>
            <Link href="/payments" className="hover:text-slate-900">Payments</Link>
            <Link href="/history" className="hover:text-slate-900">History</Link>
            <Link href="/dashboard" className="hover:text-slate-900">Analytics</Link>
            <Link href="/demo" className="hover:text-slate-900">Demo</Link>
          </div>
          <div className="flex items-center gap-3">
            {email && <span className="hidden text-xs text-slate-500 md:inline">{email}</span>}
            <button onClick={onSignOut} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}

function KpiCard({ label, value, sub, accent, icon }: { label: string; value: string; sub: string; accent: string; icon: string }) {
  const accentMap: Record<string, string> = {
    emerald: "from-emerald-50 to-emerald-100 border-emerald-200",
    indigo: "from-indigo-50 to-indigo-100 border-indigo-200",
    amber: "from-amber-50 to-amber-100 border-amber-200",
    purple: "from-purple-50 to-purple-100 border-purple-200",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br ${accentMap[accent] || accentMap.indigo} p-5 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-slate-600">{label}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
          <div className="mt-1 text-xs text-slate-600">{sub}</div>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
}

function QuickAction({ href, emoji, title, body }: { href: string; emoji: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <div className="text-2xl">{emoji}</div>
      <div className="mt-2 font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs text-slate-600">{body}</div>
    </Link>
  );
}

function PaymentRow({ p }: { p: CreatorOverview["recentPayments"][number] }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <StatusBadge status={p.status} />
          <span className="font-mono text-xs text-slate-500">{p.resource}</span>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {new Date(p.settledAt || p.createdAt).toLocaleString()}
        </div>
      </div>
      <div className="ml-4 text-right">
        <div className="font-mono text-sm font-semibold text-slate-900">${formatUsdc(p.amountUsdc)}</div>
        {p.arcScanUrl && (
          <a href={p.arcScanUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:text-indigo-500">
            ArcScan ↗
          </a>
        )}
      </div>
    </div>
  );
}

function ProofRow({ pr }: { pr: CreatorOverview["recentProofs"][number] }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-900">{pr.paymentHash.slice(0, 12)}…</span>
          <VerificationBadge status={pr.verificationStatus} />
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {new Date(pr.createdAt).toLocaleString()}
        </div>
      </div>
      <a href={pr.arcScanUrl} target="_blank" rel="noreferrer" className="ml-4 text-xs text-indigo-600 hover:text-indigo-500">
        ArcScan ↗
      </a>
    </div>
  );
}

function ActivityFeed({ payments, proofs }: { payments: CreatorOverview["recentPayments"]; proofs: CreatorOverview["recentProofs"] }) {
  const events = [
    ...payments.map((p) => ({
      type: "payment" as const,
      ts: new Date(p.settledAt || p.createdAt).getTime(),
      payload: p,
    })),
    ...proofs.map((pr) => ({
      type: "proof" as const,
      ts: new Date(pr.createdAt).getTime(),
      payload: pr,
    })),
  ].sort((a, b) => b.ts - a.ts).slice(0, 8);

  if (events.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Activity will appear here as your first payments are settled.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {events.map((e, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-500" />
          <div className="flex-1">
            <div className="text-sm text-slate-900">
              {e.type === "payment" ? (
                <>
                  Payment settled · <span className="font-mono">${formatUsdc(e.payload.amountUsdc)}</span>
                </>
              ) : (
                <>Settlement proof generated · <span className="font-mono">{e.payload.paymentHash.slice(0, 10)}…</span></>
              )}
            </div>
            <div className="text-xs text-slate-500">
              {new Date(e.ts).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    SETTLED: "bg-emerald-100 text-emerald-800",
    PENDING: "bg-amber-100 text-amber-800",
    AUTHORIZED: "bg-blue-100 text-blue-800",
    FAILED: "bg-rose-100 text-rose-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[status] || "bg-slate-100 text-slate-800"}`}>
      {status}
    </span>
  );
}

function VerificationBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    VERIFIED: "bg-emerald-100 text-emerald-800",
    PENDING: "bg-amber-100 text-amber-800",
    FAILED: "bg-rose-100 text-rose-800",
    INCONCLUSIVE: "bg-slate-100 text-slate-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[status] || "bg-slate-100 text-slate-800"}`}>
      {status}
    </span>
  );
}

function EmptyState({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <div className="text-3xl">{emoji}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs text-slate-600">{body}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}

function Logo() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M3 12l4-7 4 7-4 7-4-7zm10 0l4-7 4 7-4 7-4-7z" fill="currentColor" />
      </svg>
    </span>
  );
}

function formatUsdc(raw: string): string {
  // raw is in 6-decimal atomic units (string)
  const n = Number(raw);
  if (!isFinite(n)) return "0.000000";
  return (n / 1_000_000).toFixed(6);
}