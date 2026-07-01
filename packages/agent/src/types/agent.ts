/**
 * Agent types — the canonical shape of an end-to-end NanoProof research run.
 *
 * The flow is:
 *   Question → Research → Citation Match → Attribution → Payment Allocation → Settlement
 *
 * Every type is pure-data so the same shape can move between server, agent,
 * SDK, and the web UI without impedance mismatch.
 */

export interface AgentQuestion {
  text: string;
  /** Optional demo scenario override. */
  topic?: "bitcoin-restaking" | "creator-economy" | "agent-payments" | "auto";
}

export interface ResolvedSource {
  /** Source id in the NanoProof DB (or the demo dataset). */
  sourceId: string;
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  title: string;
  url: string;
  domain: string;
  /** Per-citation price in atomic USDC. */
  citationPrice: string;
}

export interface CitationMatch {
  source: ResolvedSource;
  /** Match score 0-1. */
  score: number;
  /** 0-100, contribution to the answer. */
  contributionPct: number;
  /** Where in the answer the citation appears. */
  snippet: string;
}

export interface Attribution {
  sourceId: string;
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  contributionPct: number;
  payoutAtomic: string;
  payoutUsd: string;
}

export interface PaymentAllocation {
  attribution: Attribution;
  status: "PENDING" | "QUOTED" | "SETTLED" | "CAPPED" | "FAILED";
  paymentId: string | null;
  txHash: string | null;
  arcScanUrl: string | null;
  settledAt: string | null;
}

export interface AgentAnswer {
  question: AgentQuestion;
  /** Synthesized text that cites the matched sources. */
  responseText: string;
  /** responseId stamped by the protocol's /v1/citations/detect. */
  responseId: string;
  citations: CitationMatch[];
  attribution: Attribution[];
  payments: PaymentAllocation[];
  /** Total USDC paid across all creators (atomic). */
  totalPaidAtomic: string;
  /** Total USDC paid (display). */
  totalPaidUsd: string;
  /** Wall-clock duration of the full run in ms. */
  durationMs: number;
  /** Demo scenario tag (e.g. "bitcoin-restaking"). */
  scenario: string;
}
