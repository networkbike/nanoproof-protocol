"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/utils";

interface AgentAnswer {
  question: { text: string; topic?: string };
  responseText: string;
  responseId: string;
  citations: Array<{
    source: {
      sourceId: string;
      creatorId: string;
      creatorName: string;
      creatorUsername: string;
      title: string;
      url: string;
      domain: string;
      citationPrice: string;
    };
    score: number;
    contributionPct: number;
    snippet: string;
  }>;
  attribution: Array<{
    sourceId: string;
    creatorId: string;
    creatorName: string;
    creatorUsername: string;
    contributionPct: number;
    payoutAtomic: string;
    payoutUsd: string;
  }>;
  payments: Array<{
    attribution: {
      creatorId: string;
      creatorName: string;
      creatorUsername: string;
      contributionPct: number;
      payoutAtomic: string;
      payoutUsd: string;
    };
    status: string;
    paymentId: string | null;
    txHash: string | null;
    arcScanUrl: string | null;
    settledAt: string | null;
  }>;
  totalPaidAtomic: string;
  totalPaidUsd: string;
  durationMs: number;
  scenario: string;
}

const SUGGESTED = [
  "How does Bitcoin restaking work with SatLayer and Babylon?",
  "Why is per-piece citation pricing better than the ad-driven creator economy?",
  "What is Arc and why does it matter for USDC-denominated agent payments?",
];

export default function ResearchPage() {
  const [question, setQuestion] = useState(SUGGESTED[0]);
  const [answer, setAnswer] = useState<AgentAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run() {
    setError(null);
    setAnswer(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, mode: "live" }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        setAnswer((await res.json()) as AgentAnswer);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="space-y-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Every AI Citation Becomes a Payment.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          NanoProof is the open infrastructure that turns AI research into a settlement event. Ask a question,
          watch the agent cite registered Sources on Arc, and see USDC flow to the creators — in real time.
        </p>
      </section>

      {/* Query */}
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <label className="block text-sm font-medium">Ask a question</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="e.g. How does Bitcoin restaking work?"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuestion(q)}
                className="rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {q}
              </button>
            ))}
          </div>
          <Button onClick={run} disabled={isPending || question.trim().length < 1} className="px-6">
            {isPending ? "Researching…" : "Ask the agent"}
          </Button>
        </div>
        {error && (
          <div className="mt-3 rounded-md border border-destructive bg-card p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </section>

      {answer && (
        <>
          <Panel title="AI Response" subtitle={`responseId: ${answer.responseId} · scenario: ${answer.scenario} · ${answer.durationMs}ms`}>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{answer.responseText}</pre>
          </Panel>

          <SourcesPanel citations={answer.citations} />
          <AttributionPanel rows={answer.attribution} />
          <PaymentPanel rows={answer.payments} totalAtomic={answer.totalPaidAtomic} totalUsd={answer.totalPaidUsd} />
          <SettlementPanel rows={answer.payments} />
          <ProofPanel answer={answer} />
        </>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Panels
// -----------------------------------------------------------------------------

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex items-end justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        {subtitle && <span className="text-xs text-muted-foreground font-mono">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function SourcesPanel({ citations }: { citations: AgentAnswer["citations"] }) {
  return (
    <Panel title="Sources Used" subtitle={`${citations.length} matched`}>
      {citations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No registered sources matched this question.</p>
      ) : (
        <ol className="space-y-3">
          {citations.map((c, i) => (
            <li key={c.source.sourceId} className="rounded-md border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Source #{i + 1} · score {c.score.toFixed(3)} · {c.contributionPct}%
                  </p>
                  <a href={c.source.url} target="_blank" rel="noreferrer" className="text-base font-medium underline">
                    {c.source.title}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    by {c.source.creatorName} · @{c.source.creatorUsername} · {c.source.domain}
                  </p>
                </div>
                <code className="shrink-0 rounded bg-muted px-2 py-1 text-xs">{c.source.sourceId}</code>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">"{c.snippet}"</p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function AttributionPanel({ rows }: { rows: AgentAnswer["attribution"] }) {
  return (
    <Panel title="Attribution" subtitle="per-creator contribution %">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attribution to compute.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-2">Creator</th>
              <th className="p-2 text-right">Contribution</th>
              <th className="p-2 text-right">Payout (atomic)</th>
              <th className="p-2 text-right">Payout (USDC)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.creatorId} className="border-t">
                <td className="p-2">
                  <div className="font-medium">{a.creatorName}</div>
                  <div className="text-xs text-muted-foreground">@{a.creatorUsername}</div>
                </td>
                <td className="p-2 text-right">
                  <div className="font-mono">{a.contributionPct}%</div>
                  <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(a.contributionPct, 100)}%` }}
                    />
                  </div>
                </td>
                <td className="p-2 text-right font-mono">{a.payoutAtomic}</td>
                <td className="p-2 text-right font-mono">${a.payoutUsd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

function PaymentPanel({
  rows,
  totalAtomic,
  totalUsd,
}: {
  rows: AgentAnswer["payments"];
  totalAtomic: string;
  totalUsd: string;
}) {
  return (
    <Panel title="Payment Allocation" subtitle="USDC sent to each creator">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payouts to allocate.</p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="p-2">Creator</th>
                <th className="p-2 text-right">Allocation</th>
                <th className="p-2 text-right">USDC</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.attribution.creatorId} className="border-t">
                  <td className="p-2 font-medium">{p.attribution.creatorName}</td>
                  <td className="p-2 text-right font-mono">{p.attribution.contributionPct}%</td>
                  <td className="p-2 text-right font-mono">${p.attribution.payoutUsd}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex items-center justify-between rounded-md border bg-muted p-3 text-sm">
            <span className="font-medium">Total creator earnings</span>
            <span className="font-mono">
              {totalAtomic} atomic · ${totalUsd}
            </span>
          </div>
        </>
      )}
    </Panel>
  );
}

function SettlementPanel({ rows }: { rows: AgentAnswer["payments"] }) {
  return (
    <Panel title="Settlement" subtitle="testnet USDC status per payment">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No settlement activity.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-2">Creator</th>
              <th className="p-2">Status</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2">Settled at</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.attribution.creatorId} className="border-t">
                <td className="p-2 font-medium">{p.attribution.creatorName}</td>
                <td className="p-2">
                  <StatusBadge status={p.status} />
                </td>
                <td className="p-2 text-right font-mono">${p.attribution.payoutUsd}</td>
                <td className="p-2 text-xs text-muted-foreground">
                  {p.settledAt ? new Date(p.settledAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

function ProofPanel({ answer }: { answer: AgentAnswer }) {
  const total = formatUsd(answer.totalPaidAtomic);
  const settledCount = answer.payments.filter((p) => p.status === "SETTLED").length;
  return (
    <Panel title="Payment Proof" subtitle="what the judge sees after one click">
      <div className="grid gap-3 md:grid-cols-2">
        <Stat label="Response ID" value={answer.responseId} />
        <Stat label="Total paid" value={`${answer.totalPaidAtomic} atomic ($${total} USDC)`} />
        <Stat label="Settled payments" value={`${settledCount} / ${answer.payments.length}`} />
        <Stat label="Scenario" value={answer.scenario} />
      </div>
      <details className="mt-4 text-xs text-muted-foreground">
        <summary>Raw response</summary>
        <pre className="mt-2 overflow-x-auto rounded bg-muted p-3 font-mono">
{JSON.stringify(answer, null, 2)}
        </pre>
      </details>
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-all font-mono text-sm">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SETTLED: "bg-emerald-100 text-emerald-800",
    PENDING: "bg-amber-100 text-amber-800",
    FAILED: "bg-red-100 text-red-800",
    QUOTED: "bg-sky-100 text-sky-800",
    CAPPED: "bg-orange-100 text-orange-800",
  };
  const cls = colors[status] ?? "bg-gray-100 text-gray-800";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}
