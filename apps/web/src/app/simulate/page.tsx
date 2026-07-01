"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface DetectResult {
  responseId: string;
  totalUsdc: string;
  resolvedCreatorIds: string[];
  citations: Array<{
    id: string;
    snippet: string;
    kind: string;
    matchKind: string;
    matchScore: string;
    payoutAmountUsdc: string;
    sourceId: string;
  }>;
  unresolved: Array<{ url: string; snippet: string }>;
}

interface SettleResult {
  id: string;
  amountUsdc: string;
  status: string;
  creatorId: string;
}

const DEFAULT_RESPONSE = `Following Smith's analysis on Arc nanopayments [1], agents can settle $0.001 per citation in USDC.
The protocol sketch at https://demo.nanoproof.xyz/hello demonstrates settlement via Circle Gateway.
We also reference https://example.com/somewhere-else which is not registered.`;

export default function SimulatePage() {
  const [responseId, setResponseId] = useState(`resp_${Date.now()}`);
  const [responseText, setResponseText] = useState(DEFAULT_RESPONSE);
  const [busy, setBusy] = useState(false);
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null);
  const [settleResult, setSettleResult] = useState<SettleResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runPipeline() {
    setBusy(true);
    setError(null);
    setDetectResult(null);
    setSettleResult(null);

    try {
      // Stage 1 — detect citations.
      const detect = await fetch(`${API_BASE}/v1/citations/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": `detect-${responseId}` },
        body: JSON.stringify({ responseId, responseText }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).message ?? `HTTP ${r.status}`);
        return r.json() as Promise<DetectResult>;
      });
      setDetectResult(detect);

      if (detect.citations.length === 0) {
        setError("No citations resolved. Register a Source first via the dashboard.");
        return;
      }

      // Stage 2 — settle one Payment per Citation.
      const settled = await fetch(`${API_BASE}/v1/payments/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": `settle-${responseId}` },
        body: JSON.stringify({ responseId }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).message ?? `HTTP ${r.status}`);
        return r.json() as Promise<SettleResult[]>;
      });
      setSettleResult(settled);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Citation Pipeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real Phase 3 detector + Payment settlement. Drop an agent's response text below; the engine finds every URL,
          matches against registered Sources, and settles USDC.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runPipeline();
        }}
        className="space-y-4 rounded-lg border bg-card p-6"
      >
        <Field label="Response ID">
          <input
            value={responseId}
            onChange={(e) => setResponseId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono text-xs"
            required
          />
        </Field>
        <Field label="Agent response (free-form text)">
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            rows={6}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
        </Field>

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Running…" : "Run detect + settle"}
        </Button>
      </form>

      {error && (
        <div className="rounded-lg border border-destructive bg-card p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {detectResult && (
        <Result
          title={`Detection · ${detectResult.citations.length} resolved / ${detectResult.unresolved.length} unresolved`}
          rows={[
            ["Total USDC (atomic)", detectResult.totalUsdc],
            ["Total USDC (display)", `${(Number(detectResult.totalUsdc) / 1_000_000).toFixed(6)}`],
            ["Resolved Creator IDs", detectResult.resolvedCreatorIds.join(", ") || "—"],
          ]}
        />
      )}

      {detectResult && detectResult.citations.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Citations</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="p-2">Match</th>
                <th className="p-2">Score</th>
                <th className="p-2 text-right">Payout</th>
              </tr>
            </thead>
            <tbody>
              {detectResult.citations.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-2 font-mono text-xs">
                    {c.matchKind} · {c.sourceId.slice(0, 14)}…
                  </td>
                  <td className="p-2">{c.matchScore}</td>
                  <td className="p-2 text-right font-mono">
                    {c.payoutAmountUsdc} ({((Number(c.payoutAmountUsdc) / 1_000_000).toFixed(6))} USDC)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <details className="mt-3 text-xs text-muted-foreground">
            <summary>Unresolved links ({detectResult.unresolved.length})</summary>
            <ul className="mt-2 space-y-1">
              {detectResult.unresolved.map((u, i) => (
                <li key={i} className="font-mono break-all">
                  {u.url}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      {settleResult && (
        <Result
          title={`Settled ${settleResult.length} payment(s)`}
          rows={settleResult.map((p, i) => [
            `Payment #${i + 1}`,
            `${p.id.slice(0, 14)}… · ${p.amountUsdc} USDC atomic · ${p.status} · → creator ${p.creatorId.slice(0, 14)}…`,
          ])}
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
