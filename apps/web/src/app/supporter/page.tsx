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

interface SupporterOverview {
  supporter: { address: string };
  spending: {
    totalUsdcDisplay: string;
    totalUsdcRaw: string;
    totalPayments: number;
    uniqueCreators: number;
    avgPaymentUsdc: string;
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
    creatorHandle?: string;
    creatorDisplayName?: string;
  }>;
  recentCreators: Array<{
    handle: string;
    displayName: string;
    walletAddress: string;
    totalPaid: string;
    payments: number;
  }>;
  protocolStats: {
    totalSettlements: number;
    totalVerified: number;
    uniqueSupporters: number;
  };
}

export default function SupporterDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [overview, setOverview] = useState<SupporterOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("nanoproof-session");
    if (!stored) {
      router.push("/sign-in");
      return;
    }
    const s = JSON.parse(stored) as Session;
    setSession(s);
    load(s);
    const interval = setInterval(() => load(s), 12_000);
    return () => clearInterval(interval);
  }, [router]);

  async function load(s: Session) {
    try {
      const r = await fetch("/api/supporter/overview");
      if (r.ok) setOverview(await r.json());
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    localStorage.removeItem("nanoproof-session");
    router.push("/landing");
  }

  function switchRole() {
    router.push("/sign-in");
  }

  if (loading) {
    return <Shell email={session?.email || ""} onSignOut={signOut} onSwitchRole={switchRole}><Skeleton /></Shell>;
  }

  if (!overview) {
    return (
      <Shell email={session?.email || ""} onSignOut={signOut} onSwitchRole={switchRole}>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-900">
          Failed to load your supporter dashboard.
        </div>
      </Shell>
    );
  }

  const sp = overview.spending;
  const ps = overview.protocolStats;

  return (
    <Shell email={session?.email || ""} onSignOut={signOut} onSwitchRole={switchRole}>
      {/* Welcome */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-lg">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-blue-100">Supporter dashboard</div>
            <h1 className="mt-2 text-3xl font-bold">Thanks for supporting creators</h1>
            <p className="mt-1 text-sm text-blue-100">
              Address: <code className="font-mono">{overview.supporter.address.slice(0, 10)}…{overview.supporter.address.slice(-6)}</code>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={switchRole}
              className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
            >
              Switch role
            </button>
            <Link
              href="/payments"
              className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-slate-50"
            >
              Pay a creator →
            </Link>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total spent"
          value={`$${sp.totalUsdcDisplay}`}
          sub="USDC across all payments"
          accent="blue"
          icon="💸"
        />
        <KpiCard
          label="Payments made"
          value={sp.totalPayments.toString()}
          sub="Settlement transactions"
          accent="indigo"
          icon="📝"
        />
        <KpiCard
          label="Creators supported"
          value={sp.uniqueCreators.toString()}
          sub="Distinct payee addresses"
          accent="purple"
          icon="💎"
        />
        <KpiCard
          label="Avg per payment"
          value={`$${sp.avgPaymentUsdc}`}
          sub="USDC per citation"
          accent="emerald"
          icon="📊"
        />
      </div>

      {/* Protocol stats strip */}
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <ProtocolStat label="Protocol-wide settlements" value={ps.totalSettlements.toString()} />
        <ProtocolStat label="ArcScan-verified" value={ps.totalVerified.toString()} />
        <ProtocolStat label="Unique supporters" value={ps.uniqueSupporters.toString()} />
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Quick actions</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/payments" emoji="💳" title="Make payment" body="Support a creator with USDC" />
          <QuickAction href="/payments?demo=1" emoji="⚡" title="Try x402 demo" body="Full lifecycle in 8 seconds" />
          <QuickAction href="/history" emoji="📜" title="Payment history" body="All your settlements" />
          <QuickAction href="/dashboard" emoji="📈" title="Protocol analytics" body="Network-wide metrics" />
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
              body="Make your first payment to a creator."
            />
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {overview.recentPayments.slice(0, 6).map((p) => (
                <SupporterPaymentRow key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>

        {/* Favourite creators */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Creators you support</h2>
            <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-500">Discover →</Link>
          </div>
          {overview.recentCreators.length === 0 ? (
            <EmptyState
              emoji="💎"
              title="No creators yet"
              body="Creators you pay will appear here."
            />
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {overview.recentCreators.slice(0, 6).map((c) => (
                <CreatorRow key={c.walletAddress} c={c} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Recent activity</h2>
        <div className="mt-4 space-y-3">
          {overview.recentPayments.slice(0, 6).map((p) => (
            <div key={p.id} className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
              <div className="flex-1">
                <div className="text-sm text-slate-900">
                  Paid <span className="font-mono font-semibold">${formatUsdc(p.amountUsdc)}</span> to a creator
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(p.settledAt || p.createdAt).toLocaleString()}
                </div>
              </div>
              {p.arcScanUrl && (
                <a href={p.arcScanUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:text-indigo-500">
                  ArcScan ↗
                </a>
              )}
            </div>
          ))}
          {overview.recentPayments.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Activity will appear here after your first payment.
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ email, onSignOut, onSwitchRole, children }: { email: string; onSignOut: () => void; onSwitchRole: () => void; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/landing" className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-slate-900">NanoProof</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <Link href="/supporter" className="font-medium text-slate-900">Dashboard</Link>
            <Link href="/payments" className="hover:text-slate-900">Payments</Link>
            <Link href="/history" className="hover:text-slate-900">History</Link>
            <Link href="/dashboard" className="hover:text-slate-900">Analytics</Link>
            <Link href="/demo" className="hover:text-slate-900">Demo</Link>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onSwitchRole} className="hidden rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 md:inline-flex">
              Switch role
            </button>
            <span className="hidden text-xs text-slate-500 md:inline">{email}</span>
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
    blue: "from-blue-50 to-blue-100 border-blue-200",
    indigo: "from-indigo-50 to-indigo-100 border-indigo-200",
    purple: "from-purple-50 to-purple-100 border-purple-200",
    emerald: "from-emerald-50 to-emerald-100 border-emerald-200",
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

function ProtocolStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function QuickAction({ href, emoji, title, body }: { href: string; emoji: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
    >
      <div className="text-2xl">{emoji}</div>
      <div className="mt-2 font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs text-slate-600">{body}</div>
    </Link>
  );
}

function SupporterPaymentRow({ p }: { p: SupporterOverview["recentPayments"][number] }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-500">{p.resource}</span>
          <StatusBadge status={p.status} />
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

function CreatorRow({ c }: { c: SupporterOverview["recentCreators"][number] }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
          {c.displayName?.[0]?.toUpperCase() || c.handle?.[0]?.toUpperCase() || "?"}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900">{c.displayName}</div>
          <div className="text-xs text-slate-500">@{c.handle} · {c.payments} payments</div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-sm font-semibold text-slate-900">${c.totalPaid}</div>
      </div>
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
  const n = Number(raw);
  if (!isFinite(n)) return "0.000000";
  return (n / 1_000_000).toFixed(6);
}