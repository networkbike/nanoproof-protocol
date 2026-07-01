"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Demo Mode — one-click dataset loader for live presentations.
 *
 * POSTs to /api/analytics/demo/seed (a thin server proxy that forwards
 * to the api's POST /v1/analytics/demo/seed with the caller's auth).
 * On success it refreshes the dashboard pages and shows a brief summary.
 */
export function DemoButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  async function onClick() {
    setResult(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/analytics/demo/seed", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            creators: 100,
            sources: 500,
            citations: 1000,
            payments: 1000,
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          setResult(`❌ ${text.slice(0, 200)}`);
          return;
        }
        const json = (await res.json()) as {
          seeded?: { creators: number; sources: number; citations: number; payments: number };
          durationMs?: number;
        };
        if (json.seeded) {
          const s = json.seeded;
          setResult(`✅ ${s.creators}c / ${s.sources}s / ${s.citations}cit / ${s.payments}pay`);
        }
        // Refresh all server components so the KPI strip updates.
        router.refresh();
      } catch (err) {
        setResult(`❌ ${(err as Error).message}`);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={onClick} disabled={pending} variant="default" size="sm" className="w-full">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        Load demo dataset
      </Button>
      {result && (
        <p className="break-words text-xs text-muted-foreground">{result}</p>
      )}
    </div>
  );
}