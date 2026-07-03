import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * NanoProof — Lepton judges entry page.
 *
 * Goal: get a judge from "what is this?" to "I just ran a complete
 * x402 payment flow on Arc" in under 60 seconds.
 *
 * Recommended demo path (in order):
 *   1. /payments — click "Start x402 flow" → see the full settlement + ArcScan link
 *   2. /history — see the populated settlement table
 *   3. /dashboard — see Phase 8 metrics update live
 *
 * All three pages are populated with realistic demo data on first load.
 */

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="space-y-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Lepton Hackathon · Canteen × Circle × Arc · Phase 8 Live
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
          Citation-level USDC payouts for the agent economy.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          NanoProof is the open infrastructure layer that lets AI agents
          automatically compensate creators with USDC nanopayments — settled
          on Arc via{" "}
          <span className="font-mono text-foreground">x402</span>, verified on{" "}
          <a
            href="https://testnet.arcscan.app"
            target="_blank"
            rel="noreferrer"
            className="text-amber-300 hover:underline"
          >
            ArcScan
          </a>
          .
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Button asChild size="lg">
            <Link href="/payments">▶ Try the x402 flow</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/history">View settlement history</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        </div>
      </section>

      {/* Demo path — 3 steps */}
      <section>
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs uppercase tracking-wide text-slate-400 font-mono">
              Recommended demo path · 60 seconds
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <DemoStep
              n={1}
              title="Run x402 payment"
              desc="Click 'Start x402 flow' to watch a complete HTTP 402 → EIP-3009 → Arc settlement → ArcScan verification in under 10 seconds."
              href="/payments"
              cta="Open /payments"
            />
            <DemoStep
              n={2}
              title="See history populate"
              desc="After settlement, /history auto-refreshes to show the new entry with ArcScan link, txHash, blockNumber, and verification timeline."
              href="/history"
              cta="Open /history"
            />
            <DemoStep
              n={3}
              title="Watch dashboard update"
              desc="Protocol metrics (settlements, USDC, unique supporters, ArcScan verified) update in real time on /dashboard."
              href="/dashboard"
              cta="Open /dashboard"
            />
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section>
        <h2 className="text-xl font-semibold mb-4">What's running</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Capability
            label="x402 Payment Protocol"
            desc="HTTP 402 Payment Required + PAYMENT-REQUIRED header (Coinbase open standard). EIP-3009 transferWithAuthorization."
            accent="indigo"
          />
          <Capability
            label="Arc Settlement Proof"
            desc="Every payment produces a hash-chained, immutable SettlementProof with paymentHash, txHash, blockNumber, ArcScan URL."
            accent="amber"
          />
          <Capability
            label="ArcScan Verification"
            desc="Server polls Blockscout v2 API (testnet.arcscan.app/api/v2) to confirm the tx is mined + status=1. Append-only event log."
            accent="emerald"
          />
          <Capability
            label="Open Agent Stack"
            desc="All 11 x402 endpoints are public — no API keys required. AI agents pay autonomously via the PAYMENT-SIGNATURE header."
            accent="fuchsia"
          />
        </div>
      </section>

      {/* Links */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card
          title="📚 Documentation"
          body="PHASE8.md, X402_IMPLEMENTATION.md, PAYMENT_FLOW.md, ARC_SETTLEMENT.md, API_REFERENCE.md — all in /docs."
        />
        <Card
          title="🧪 Tested"
          body="12 e2e tests covering the full lifecycle (create → authorize → settle → verify) + hash chain integrity. All passing."
        />
        <Card
          title="🚀 Demo mode"
          body="NANOPROOF_DEMO_MODE=true synthesises Arc-shaped txHashes so the entire flow runs without a real onchain broadcast."
        />
      </section>
    </div>
  );
}

function DemoStep({
  n,
  title,
  desc,
  href,
  cta,
}: {
  n: number;
  title: string;
  desc: string;
  href: string;
  cta: string;
}): React.ReactElement {
  return (
    <div className="relative rounded-lg border border-slate-700 bg-slate-950/60 p-4 hover:border-indigo-500/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-sm">
          {n}
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-slate-100">{title}</h3>
          <p className="text-sm text-slate-400">{desc}</p>
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200"
          >
            {cta} →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Capability({
  label,
  desc,
  accent,
}: {
  label: string;
  desc: string;
  accent: "indigo" | "amber" | "emerald" | "fuchsia";
}): React.ReactElement {
  const accentClass = {
    indigo: "border-indigo-500/30 bg-indigo-500/5 text-indigo-300",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-300",
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
    fuchsia: "border-fuchsia-500/30 bg-fuchsia-500/5 text-fuchsia-300",
  }[accent];
  return (
    <div className={`rounded-lg border p-4 ${accentClass}`}>
      <div className="text-xs uppercase tracking-wide font-mono">{label}</div>
      <p className="mt-2 text-sm text-slate-300">{desc}</p>
    </div>
  );
}

function Card({
  title,
  body,
}: {
  title: string;
  body: string;
}): React.ReactElement {
  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}