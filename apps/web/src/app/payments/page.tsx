"use client";

import * as React from "react";



/**
 * NanoProof — x402 Payment Flow (Phase 8)
 *
 * This page is the centerpiece of the Lepton demo. Judges:
 *
 *   1. Pick a creator (or use the default)
 *   2. Click "Start x402 Flow"
 *   3. Watch the full lifecycle: challenge -> authorize -> settle -> verify
 *   4. See the ArcScan link, the txHash, the verification status
 *
 * The flow runs entirely client-side, polling the api for state. After
 * the settlement the page shows the proof + verification timeline.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { x402Client, type DemoResult, type CreatorRevenue } from "../../lib/x402-client";
import { formatUsd } from "../../lib/utils";
import { PaymentModal } from "../../components/x402/payment-modal";
import { SettlementTimeline } from "../../components/x402/settlement-timeline";
import { VerificationBadge } from "../../components/x402/verification-badge";

interface Creator {
  id: string;
  username: string;
  name: string;
}

const DEFAULT_CREATORS: Creator[] = [
  { id: "cr_demo_alice", username: "alice", name: "Alice (Demo)" },
  { id: "cr_demo_bob", username: "bob", name: "Bob (Demo)" },
  { id: "cr_demo_carol", username: "carol", name: "Carol (Demo)" },
];

export default function PaymentsPage(): React.ReactElement {
  const [creators, setCreators] = useState<Creator[]>(DEFAULT_CREATORS);
  const [selectedCreator, setSelectedCreator] = useState<string>(DEFAULT_CREATORS[0]?.id ?? "");
  const [resource, setResource] = useState<string>("/v1/research/cite");
  const [amount, setAmount] = useState<string>("1000"); // atomic USDC, $0.001
  const [demoResult, setDemoResult] = useState<DemoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "creating" | "authorizing" | "settling" | "verifying" | "done">("idle");
  const [protocolMetrics, setProtocolMetrics] = useState<{
    totalSettlements: number;
    totalUsdcDisplay: string;
    x402ChallengesServed: number;
    x402PaymentsSettled: number;
  } | null>(null);
  const [revenue, setRevenue] = useState<CreatorRevenue | null>(null);

  // Fetch protocol metrics + creators on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [m, d] = await Promise.all([
          x402Client.metrics(),
          fetch("/api/creators").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        if (cancelled) return;
        setProtocolMetrics({
          totalSettlements: m.totalSettlements,
          totalUsdcDisplay: m.totalUsdcDisplay,
          x402ChallengesServed: m.x402ChallengesServed,
          x402PaymentsSettled: m.x402PaymentsSettled,
        });
        if (Array.isArray(d?.data) && d.data.length > 0) {
          const real = d.data.map((c: { id: string; username: string; name: string }) => ({
            id: c.id,
            username: c.username,
            name: c.name,
          }));
          setCreators(real);
          if (real.length > 0) setSelectedCreator(real[0]?.id ?? DEFAULT_CREATORS[0]?.id ?? "");
        }
      } catch {
        // Ignore — use defaults
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch revenue for selected creator
  useEffect(() => {
    if (!selectedCreator) return;
    let cancelled = false;
    x402Client
      .revenue(selectedCreator)
      .then((r) => {
        if (!cancelled) setRevenue(r);
      })
      .catch(() => {
        if (!cancelled) setRevenue(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCreator]);

  async function startFlow(): Promise<void> {
    if (!selectedCreator) return;
    setLoading(true);
    setError(null);
    setDemoResult(null);
    try {
      setStep("creating");
      const result = await x402Client.demo({
        creatorId: selectedCreator,
        resource,
        amountUsdc: amount,
      });
      setStep("done");
      setDemoResult(result);
      // Refresh metrics + revenue
      const [m, r] = await Promise.all([
        x402Client.metrics(),
        x402Client.revenue(selectedCreator).catch(() => null),
      ]);
      setProtocolMetrics({
        totalSettlements: m.totalSettlements,
        totalUsdcDisplay: m.totalUsdcDisplay,
        x402ChallengesServed: m.x402ChallengesServed,
        x402PaymentsSettled: m.x402PaymentsSettled,
      });
      if (r) setRevenue(r);
    } catch (err) {
      setError((err as Error).message);
      setStep("idle");
    } finally {
      setLoading(false);
    }
  }

  const currentCreator = creators.find((c) => c.id === selectedCreator);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              ← Home
            </Link>
            <Badge variant="outline" className="border-indigo-500/30 text-indigo-300">
              Phase 8
            </Badge>
            <Badge variant="outline" className="border-amber-500/30 text-amber-300">
              x402 Live
            </Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
            x402 Payment Protocol
          </h1>
          <p className="text-slate-400 text-lg max-w-3xl">
            Watch a complete HTTP 402 payment flow settle on Arc in real time.
            Every step is verifiable on{" "}
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
        </header>

        {/* Protocol metrics cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total settlements"
            value={protocolMetrics?.totalSettlements.toString() ?? "…"}
            accent="indigo"
          />
          <MetricCard
            label="USDC distributed"
            value={`$${protocolMetrics?.totalUsdcDisplay ?? "0"}`}
            accent="amber"
          />
          <MetricCard
            label="402 challenges served"
            value={protocolMetrics?.x402ChallengesServed.toString() ?? "…"}
            accent="fuchsia"
          />
          <MetricCard
            label="x402 payments settled"
            value={protocolMetrics?.x402PaymentsSettled.toString() ?? "…"}
            accent="emerald"
          />
        </section>

        {/* Creator selection + controls */}
        <section className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-slate-900/60 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Start a payment</CardTitle>
              <CardDescription className="text-slate-400">
                The demo runs the full x402 lifecycle: challenge → authorize → settle → verify.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Creator</label>
                <select
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={selectedCreator}
                  onChange={(e) => setSelectedCreator(e.target.value)}
                  disabled={loading}
                >
                  {creators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (@{c.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Resource</label>
                <select
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={resource}
                  onChange={(e) => setResource(e.target.value)}
                  disabled={loading}
                >
                  <option value="/v1/research/cite">/v1/research/cite ($0.001)</option>
                  <option value="/v1/research/answer">/v1/research/answer ($0.01)</option>
                  <option value="/v1/premium/source">/v1/premium/source ($0.005)</option>
                  <option value="/v1/agent/tool">/v1/agent/tool ($0.0025)</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">
                  Amount (atomic USDC) — ${formatUsd(amount)}
                </label>
                <input
                  type="number"
                  min={1}
                  step={100}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <Button
                onClick={startFlow}
                disabled={loading || !selectedCreator}
                className="w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    {step === "creating" && "Creating challenge…"}
                    {step === "authorizing" && "Authorizing…"}
                    {step === "settling" && "Settling on Arc…"}
                    {step === "verifying" && "Verifying on ArcScan…"}
                    {step === "idle" && "Starting…"}
                  </span>
                ) : (
                  <span>▶ Start x402 flow</span>
                )}
              </Button>

              {error && (
                <div className="text-sm text-red-300 bg-red-950/30 border border-red-800 rounded p-3">
                  {error}
                </div>
              )}

              <div className="text-xs text-slate-500 pt-2 border-t border-slate-800">
                Creator revenue:{" "}
                <span className="text-slate-300">
                  ${revenue?.totalUsdcDisplay ?? "0"} USDC
                </span>{" "}
                across {revenue?.settledPayments ?? 0} settlements ·{" "}
                {revenue?.uniqueSupporters ?? 0} unique supporters
              </div>
            </CardContent>
          </Card>

          {/* Settlement result */}
          <Card className="bg-slate-900/60 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                Latest settlement
                {demoResult && <VerificationBadge status={demoResult.verification.status} />}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {demoResult
                  ? "All steps completed. Click through to ArcScan for the on-chain proof."
                  : "Start a flow to see the settlement proof here."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {demoResult ? (
                <SettlementTimeline demo={demoResult} creator={currentCreator} />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center space-y-3">
                  <div className="mx-auto h-10 w-10 rounded-full bg-indigo-500/10 text-indigo-300 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-200">No settlement yet</p>
                    <p className="text-xs text-slate-400">
                      Click <span className="text-indigo-300">▶ Start x402 flow</span> on the left to run a complete
                      402 challenge → EIP-3009 sign → Arc settlement → ArcScan verification.
                    </p>
                    <p className="text-xs text-slate-500 italic pt-1">
                      Typical demo time: 5–10 seconds.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Step-by-step explainer */}
        <section className="grid md:grid-cols-4 gap-4">
          {[
            {
              step: "1",
              title: "402 Challenge",
              desc: "Server returns HTTP 402 + PAYMENT-REQUIRED header with the amount, network, recipient, and EIP-3009 nonce.",
            },
            {
              step: "2",
              title: "Client signs",
              desc: "AI agent (or human wallet) signs an EIP-712 transferWithAuthorization. Server receives PAYMENT-SIGNATURE header.",
            },
            {
              step: "3",
              title: "Onchain settlement",
              desc: "Facilitator submits the transferWithAuthorization on Arc (chain id 5042002). Sub-second BFT finality.",
            },
            {
              step: "4",
              title: "ArcScan verification",
              desc: "Server polls Blockscout v2 API to confirm the tx is mined + status=1. Returns PAYMENT-RESPONSE + proof.",
            },
          ].map((s) => (
            <Card key={s.step} className="bg-slate-900/40 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-200 text-base">
                  <span className="inline-block w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono mr-2 text-center leading-6">
                    {s.step}
                  </span>
                  {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <PaymentModal />
      </div>
    </main>
  );
}

// -----------------------------------------------------------------------------
// Internal subcomponent
// -----------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "indigo" | "amber" | "fuchsia" | "emerald";
}): React.ReactElement {
  const accentClass = {
    indigo: "from-indigo-500/10 to-indigo-500/0 border-indigo-500/30 text-indigo-300",
    amber: "from-amber-500/10 to-amber-500/0 border-amber-500/30 text-amber-300",
    fuchsia: "from-fuchsia-500/10 to-fuchsia-500/0 border-fuchsia-500/30 text-fuchsia-300",
    emerald: "from-emerald-500/10 to-emerald-500/0 border-emerald-500/30 text-emerald-300",
  }[accent];
  const [from, to, border, text] = [
    accentClass.split(" ")[0],
    accentClass.split(" ")[1],
    accentClass.split(" ")[2],
    accentClass.split(" ")[3],
  ];
  return (
    <div className={`bg-gradient-to-br ${from} ${to} border ${border} rounded-lg p-4`}>
      <div className={`text-xs uppercase tracking-wide ${text} font-mono`}>{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}