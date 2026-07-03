"use client";

import * as React from "react";



/**
 * Settlement proof detail page — shows the full verification timeline
 * for a single SettlementProof. Polls every 3s for live updates.
 */

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { VerificationBadge } from "../../../components/x402/verification-badge";
import { x402Client, type SettlementProofSummary, type PaymentRecord, type VerificationEventRecord } from "../../../lib/x402-client";
import { formatUsd, truncateAddress, formatRelative } from "../../../lib/utils";

export default function ProofDetailPage({ params }: { params: Promise<{ id: string }> }): React.ReactElement {
  const { id } = use(params);
  const [proof, setProof] = useState<SettlementProofSummary | null>(null);
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [events, setEvents] = useState<VerificationEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await x402Client.getProof(id);
        if (cancelled) return;
        if (result.found) {
          setProof(result.proof ?? null);
          setPayment(result.payment ?? null);
          setEvents(result.events ?? []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  async function reVerify(): Promise<void> {
    setVerifying(true);
    try {
      await x402Client.verify(id);
      // Reload
      const result = await x402Client.getProof(id);
      if (result.found) {
        setProof(result.proof ?? null);
        setEvents(result.events ?? []);
      }
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
        <div className="mx-auto max-w-4xl">
          <Link href="/history" className="text-sm text-slate-400 hover:text-slate-200">
            ← Back to history
          </Link>
          <div className="text-sm text-slate-500 italic mt-6">Loading proof…</div>
        </div>
      </main>
    );
  }

  if (!proof) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
        <div className="mx-auto max-w-4xl">
          <Link href="/history" className="text-sm text-slate-400 hover:text-slate-200">
            ← Back to history
          </Link>
          <div className="text-sm text-red-300 bg-red-950/30 border border-red-800 rounded p-3 mt-6">
            Settlement proof <code className="font-mono">{id}</code> not found.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-2">
          <Link href="/history" className="text-sm text-slate-400 hover:text-slate-200">
            ← Back to history
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-300 to-amber-200 bg-clip-text text-transparent">
              Settlement proof
            </h1>
            <VerificationBadge status={proof.verificationStatus} />
          </div>
        </header>

        <Card className="bg-slate-900/60 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center justify-between">
              <span>Proof {truncateAddress(proof.id, 14, 6)}</span>
              <button
                type="button"
                onClick={reVerify}
                disabled={verifying}
                className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded text-white"
              >
                {verifying ? "Verifying…" : "Re-verify on ArcScan"}
              </button>
            </CardTitle>
            <CardDescription className="text-slate-400">
              {proof.verificationAttempts} verification attempt{proof.verificationAttempts === 1 ? "" : "s"} ·
              last checked {proof.lastCheckedAt ? formatRelative(proof.lastCheckedAt) : "never"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <KV k="Amount" v={`$${formatUsd(proof.amountUsdc)} USDC`} />
            <KV k="Network" v={proof.network} />
            <KV k="Tx hash" v={proof.txHash} mono link={proof.arcScanUrl} />
            <KV k="Block number" v={proof.blockNumber} mono />
            <KV k="Block timestamp" v={new Date(proof.blockTimestamp).toLocaleString()} />
            <KV k="Payer" v={proof.payerAddress} mono />
            <KV k="Recipient" v={proof.payeeAddress} mono />
            <KV k="Payment hash" v={proof.paymentHash} mono />
            <KV k="Previous hash" v={proof.prevHash} mono />
            <KV k="Hash" v={proof.hash} mono />
            <KV k="Confirmed" v={proof.confirmedAt ? new Date(proof.confirmedAt).toLocaleString() : "—"} />
          </CardContent>
        </Card>

        {/* Verification timeline */}
        <Card className="bg-slate-900/60 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">Verification timeline</CardTitle>
            <CardDescription className="text-slate-400">
              Append-only log of every ArcScan check (auto + on-demand).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-sm text-slate-500 italic">No verification attempts yet.</div>
            ) : (
              <ol className="space-y-3">
                {events.map((ev, idx) => (
                  <li
                    key={ev.id}
                    className="flex items-start gap-3 border-l-2 border-slate-700 pl-3 py-1"
                  >
                    <div className="text-xs text-slate-500 font-mono">#{events.length - idx}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <VerificationBadge status={ev.status} />
                        <span className="text-xs text-slate-500">
                          via {ev.source} · {ev.confirmations} confirmation{ev.confirmations === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {new Date(ev.checkedAt).toLocaleString()}
                        {ev.blockNumber && ` · block ${ev.blockNumber}`}
                      </div>
                      {ev.errorMessage && (
                        <div className="text-xs text-amber-300 mt-1 font-mono">
                          {ev.errorMessage}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {payment && (
          <Card className="bg-slate-900/60 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Linked payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <KV k="Payment ID" v={payment.id} mono />
              <KV k="Status" v={payment.status} />
              <KV k="Amount" v={`$${formatUsd(payment.amountUsdc)} USDC`} />
              <KV k="Creator" v={payment.creatorId} mono />
              <KV k="Settled at" v={payment.settledAt ? new Date(payment.settledAt).toLocaleString() : "—"} />
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

function KV({ k, v, mono, link }: { k: string; v: string; mono?: boolean; link?: string }): React.ReactElement {
  return (
    <div className="flex items-start gap-2">
      <div className="text-slate-500 min-w-[140px]">{k}</div>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className={`text-amber-300 hover:text-amber-200 break-all ${mono ? "font-mono text-xs" : ""}`}
        >
          {v}
        </a>
      ) : (
        <div className={`text-slate-200 break-all ${mono ? "font-mono text-xs" : ""}`}>{v}</div>
      )}
    </div>
  );
}