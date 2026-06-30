"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * API keys page — Phase 2 P2-013 wires this to the real ApiKey
 * table (minted via Clerk auth). For MVP it shows the wire format
 * so reviewers can see the integration surface.
 */
export default function ApiKeysPage() {
  const [minting, setMinting] = useState(false);
  const [keys, setKeys] = useState<{ id: string; prefix: string; createdAt: string }[]>([]);

  async function mintKey() {
    setMinting(true);
    try {
      // Phase 2 wires this to POST /v1/api-keys.
      await new Promise((r) => setTimeout(r, 400));
      setKeys((prev) => [
        ...prev,
        {
          id: `key_${Math.random().toString(36).slice(2, 10)}`,
          prefix: `np_live_${Math.random().toString(36).slice(2, 8)}…`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setMinting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API keys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Authenticate your agent's outbound requests. Keys are shown once at mint time.
        </p>
      </div>

      <Button onClick={mintKey} disabled={minting}>
        {minting ? "Minting…" : "Mint a new key"}
      </Button>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Prefix</th>
              <th className="p-3">ID</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-t">
                <td className="p-3 font-mono text-xs">{k.prefix}</td>
                <td className="p-3 font-mono text-xs">{k.id}</td>
                <td className="p-3 text-muted-foreground">{k.createdAt}</td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-muted-foreground">
                  No keys minted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}