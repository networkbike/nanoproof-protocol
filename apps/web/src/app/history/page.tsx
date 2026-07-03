"use client";

import * as React from "react";



/**
 * Settlement History — list all settlements with ArcScan links, amounts,
 * verification status. Pulls from /payments/history + /supporters.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { VerificationBadge } from "../../components/x402/verification-badge";
import { x402Client, type PaymentRecord, type SettlementProofSummary } from "../../lib/x402-client";
import { formatUsd, truncateAddress, formatRelative } from "../../lib/utils";

export default function HistoryPage(): React.ReactElement {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [proofs, setProofs] = useState<SettlementProofSummary[]>([]);
  const [supporters, setSupporters] = useState<Array<{ address: string; totalPaid: string; totalPaidDisplay: string; totalPayments: number; lastSeenAt: string }>>([]);
  const [metrics, setMetrics] = useState<{ totalUsdcDisplay: string; totalSettlements: number; x402PaymentsSettled: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [h, s, m] = await Promise.all([
          x402Client.history({ limit: 50 }),
          x402Client.supporters(20),
          x402Client.metrics(),
        ]);
        if (cancelled) return;
        setPayments(h.payments);
        setProofs(h.proofs);
        setSupporters(s);
        setMetrics({
          totalUsdcDisplay: m.totalUsdcDisplay,
          totalSettlements: m.totalSettlements,
          x402PaymentsSettled: m.x402PaymentsSettled,
        });
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const proofByPaymentId = new Map(proofs.map((p) => [p.id, p]));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-2">
          <Link href="/payments" className="text-sm text-slate-400 hover:text-slate-200">
            ← Back to x402 flow
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-300 to-amber-200 bg-clip-text text-transparent">
            Settlement history
          </h1>
          <p className="text-slate-400">
            Every settlement on Arc, hash-chained and verified on ArcScan.
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Kpi label="Total settled" value={metrics?.totalSettlements.toString() ?? "…"} />
          <Kpi label="x402 payments" value={metrics?.x402PaymentsSettled.toString() ?? "…"} />
          <Kpi label="USDC distributed" value={`$${metrics?.totalUsdcDisplay ?? "0"}`} accent="amber" />
        </section>

        <section className="grid lg:grid-cols-3 gap-6">
          {/* Settlements list */}
          <Card className="bg-slate-900/60 border-slate-700 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-slate-100">Settlements</CardTitle>
              <CardDescription className="text-slate-400">
                Click any row to view the proof + verification timeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading && payments.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-slate-500">
                  <svg className="animate-spin mr-2 h-4 w-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                  Loading settlements…
                </div>
              ) : payments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/50 p-8 text-center space-y-3">
                  <div className="mx-auto h-10 w-10 rounded-full bg-amber-500/10 text-amber-300 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-200">No settlements yet</p>
                    <p className="text-xs text-slate-400">
                      Run the x402 flow on the{" "}
                      <Link href="/payments" className="text-amber-300 hover:underline">
                        payments page
                      </Link>{" "}
                      to create your first one.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-slate-500 border-b border-slate-800">
                      <tr>
                        <th className="text-left py-2">Payment</th>
                        <th className="text-right py-2">Amount</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Settled</th>
                        <th className="text-right py-2">Proof</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => {
                        const proof = proofByPaymentId.get(p.id);
                        return (
                          <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                            <td className="py-2">
                              <div className="font-mono text-xs text-slate-300">{truncateAddress(p.id, 14, 6)}</div>
                              {p.txHash && (
                                <a
                                  href={p.arcScanUrl ?? "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-amber-300 hover:underline font-mono"
                                >
                                  {truncateAddress(p.txHash, 10, 6)}
                                </a>
                              )}
                            </td>
                            <td className="py-2 text-right font-mono text-slate-200">
                              ${formatUsd(p.amountUsdc)}
                            </td>
                            <td className="py-2">
                              {proof ? (
                                <VerificationBadge status={proof.verificationStatus} />
                              ) : (
                                <Badge variant="outline" className="border-slate-600 text-slate-400">
                                  No proof
                                </Badge>
                              )}
                            </td>
                            <td className="py-2 text-xs text-slate-400">
                              {p.settledAt ? formatRelative(p.settledAt) : "—"}
                            </td>
                            <td className="py-2 text-right">
                              {proof && (
                                <Link
                                  href={`/history/${proof.id}`}
                                  className="text-xs text-indigo-300 hover:text-indigo-200"
                                >
                                  View →
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supporters list */}
          <Card className="bg-slate-900/60 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Recent supporters</CardTitle>
              <CardDescription className="text-slate-400">
                Unique payer wallets (AI agents + humans).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {supporters.length === 0 ? (
                <div className="text-sm text-slate-500 italic">No supporters yet.</div>
              ) : (
                <div className="space-y-2">
                  {supporters.map((s) => (
                    <div
                      key={s.address}
                      className="flex items-center justify-between text-sm py-1 border-b border-slate-800/50"
                    >
                      <div>
                        <div className="font-mono text-slate-200">{truncateAddress(s.address, 8, 6)}</div>
                        <div className="text-xs text-slate-500">
                          {s.totalPayments} payment{s.totalPayments === 1 ? "" : "s"} ·{" "}
                          {formatRelative(s.lastSeenAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-slate-200">${s.totalPaidDisplay}</div>
                        <div className="text-xs text-slate-500">USDC</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "amber" | "indigo";
}): React.ReactElement {
  const accentClass =
    accent === "amber"
      ? "from-amber-500/10 to-amber-500/0 border-amber-500/30"
      : "from-indigo-500/10 to-indigo-500/0 border-indigo-500/30";
  return (
    <div className={`bg-gradient-to-br ${accentClass} border rounded-lg p-4`}>
      <div className="text-xs uppercase tracking-wide text-slate-400 font-mono">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}