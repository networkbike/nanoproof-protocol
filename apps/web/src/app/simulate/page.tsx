"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface CitationResult {
  id: string;
  snippet: string;
  kind: string;
  matchScore: string;
  payoutAmountUsdc: string;
}

interface PaymentResult {
  id: string;
  amountUsdc: string;
  status: string;
}

export default function SimulatePage() {
  const [creatorId, setCreatorId] = useState("cr_demo");
  const [sourceId, setSourceId] = useState("");
  const [snippet, setSnippet] = useState(
    "Following Smith's analysis of nanopayments on Arc, agents can settle $0.001 per citation in USDC."
  );
  const [responseId, setResponseId] = useState(`resp_${Date.now()}`);
  const [amountUsdc, setAmountUsdc] = useState("1000");
  const [busy, setBusy] = useState(false);
  const [citationResult, setCitationResult] = useState<CitationResult | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSimulation() {
    setBusy(true);
    setError(null);
    setCitationResult(null);
    setPaymentResult(null);

    try {
      const citation = await fetch(`${API_BASE}/v1/citations/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, snippet, responseId }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).message ?? `HTTP ${r.status}`);
        return r.json() as Promise<CitationResult>;
      });
      setCitationResult(citation);

      const payment = await fetch(`${API_BASE}/v1/payments/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, sourceId, amountUsdc }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).message ?? `HTTP ${r.status}`);
        return r.json() as Promise<PaymentResult>;
      });
      setPaymentResult(payment);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Simulator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit a fake citation + payment. Phase 3 + 4 replace this with real detection + Arc settlement.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSimulation();
        }}
        className="space-y-4 rounded-lg border bg-card p-6"
      >
        <Field label="Creator ID">
          <input
            value={creatorId}
            onChange={(e) => setCreatorId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
        </Field>
        <Field label="Source ID">
          <input
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="src_..."
            required
          />
        </Field>
        <Field label="Response ID">
          <input
            value={responseId}
            onChange={(e) => setResponseId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono text-xs"
            required
          />
        </Field>
        <Field label="Cited snippet">
          <textarea
            value={snippet}
            onChange={(e) => setSnippet(e.target.value)}
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
        </Field>
        <Field label="Amount (atomic USDC)">
          <input
            type="number"
            value={amountUsdc}
            onChange={(e) => setAmountUsdc(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            min={1}
            required
          />
        </Field>

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Simulating…" : "Run simulation"}
        </Button>
      </form>

      {error && (
        <div className="rounded-lg border border-destructive bg-card p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {citationResult && (
        <Result
          title="Citation recorded"
          rows={[
            ["ID", citationResult.id],
            ["Kind", citationResult.kind],
            ["Match score", citationResult.matchScore],
            ["Payout (atomic USDC)", citationResult.payoutAmountUsdc],
            ["Snippet", citationResult.snippet],
          ]}
        />
      )}

      {paymentResult && (
        <Result
          title="Payment settled"
          rows={[
            ["ID", paymentResult.id],
            ["Amount (atomic USDC)", paymentResult.amountUsdc],
            ["Status", paymentResult.status],
          ]}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function Result({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="font-semibold">{title}</h2>
      <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-mono text-xs">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}