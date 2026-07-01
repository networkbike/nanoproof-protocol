import { randomUUID } from "node:crypto";

/**
 * Minimal fetch client for the NanoProof API. Used by the research agent
 * to (a) detect citations in the synthesized response and (b) settle the
 * resulting Citations.
 */
export class NanoProofClient {
  private readonly base: string;
  private readonly apiKey: string | null;

  constructor(opts: { baseUrl: string; apiKey?: string }) {
    this.base = opts.baseUrl.replace(/\/$/, "");
    this.apiKey = opts.apiKey ?? null;
  }

  private headers(idempotencyKey: string): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    };
    if (this.apiKey) h["Authorization"] = `Bearer ${this.apiKey}`;
    return h;
  }

  async detectCitations(input: {
    responseId: string;
    responseText: string;
  }): Promise<DetectResult> {
    const res = await fetch(`${this.base}/v1/citations/detect`, {
      method: "POST",
      headers: this.headers(`detect-${input.responseId}`),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`detect failed: ${res.status} ${JSON.stringify(body)}`);
    }
    return (await res.json()) as DetectResult;
  }

  async settleCitations(input: { responseId: string }): Promise<SettleResult[]> {
    const res = await fetch(`${this.base}/v1/payments/settle`, {
      method: "POST",
      headers: this.headers(`settle-${input.responseId}`),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`settle failed: ${res.status} ${JSON.stringify(body)}`);
    }
    return (await res.json()) as SettleResult[];
  }

  static newResponseId(prefix = "resp"): string {
    return `${prefix}_${randomUUID()}`;
  }
}

export interface DetectResult {
  responseId: string;
  totalUsdc: string;
  resolvedCreatorIds: string[];
  citations: Array<{
    id: string;
    sourceId: string;
    snippet: string;
    kind: string;
    matchKind: string;
    matchScore: string;
    payoutAmountUsdc: string;
  }>;
  unresolved: Array<{ url: string; snippet: string }>;
}

export interface SettleResult {
  id: string;
  amountUsdc: string;
  status: string;
  creatorId: string;
  sourceId: string | null;
  settledAt: string | null;
}
