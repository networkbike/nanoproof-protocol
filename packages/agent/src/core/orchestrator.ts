import type { AgentAnswer, AgentQuestion, PaymentAllocation } from "../types/agent.js";
import { NanoProofClient } from "./client.js";
import { matchSources } from "../research/matcher.js";
import { synthesizeAnswer } from "../research/answer.js";
import { buildAttribution } from "../attribution/attribution.js";
import { settleAttribution, totalPaidAtomic } from "../settlement/settlement.js";

export interface ResearchOptions {
  /** NanoProof API base URL. */
  apiBaseUrl: string;
  /** Optional bearer token (np_live_….*). */
  apiKey?: string;
  /** Run against the real API (default) or pure local (no settlement). */
  mode?: "live" | "offline";
}

/**
 * End-to-end research agent.
 *
 *   Question → Research → Citation Match → Attribution → Payment Allocation → Settlement
 *
 * Returns the full AgentAnswer which the web demo renders panel-by-panel.
 */
export async function research(question: AgentQuestion, opts: ResearchOptions): Promise<AgentAnswer> {
  const t0 = Date.now();
  const responseId = NanoProofClient.newResponseId("resp");
  const client = new NanoProofClient({ baseUrl: opts.apiBaseUrl, ...(opts.apiKey ? { apiKey: opts.apiKey } : {}) });

  // 1. Citation matching — keyword overlap on the demo dataset.
  const matches = matchSources(question.text);

  // 2. Synthesize answer text that cites the matched sources inline.
  const responseText = synthesizeAnswer(question.text, matches);

  // 3. Detect citations in the synthesized text against the real registry.
  //    (In offline mode, skip — attribution is computed from the matches directly.)
  let liveCitationCount = 0;
  if (opts.mode !== "offline" && matches.length > 0) {
    try {
      const detected = await client.detectCitations({ responseId, responseText });
      liveCitationCount = detected.citations.length;
    } catch (err) {
      // The dashboard may not have the demo sources registered yet.
      // Fall through — attribution is still computed from the matches.
      void err;
    }
  }

  // 4. Build attribution from matches (or live citations if available).
  const attribution = buildAttribution(matches);

  // 5. Settle payments via the live API.
  let payments: PaymentAllocation[] = attribution.map((a) => ({
    attribution: a,
    status: "PENDING",
    paymentId: null,
    txHash: null,
    arcScanUrl: null,
    settledAt: null,
  }));

  if (opts.mode !== "offline" && liveCitationCount > 0) {
    try {
      payments = await settleAttribution(attribution, { client, responseId });
    } catch {
      // Settlement is best-effort for the demo — keep PENDING if it fails.
    }
  }

  const totalAtomic = totalPaidAtomic(payments);
  const totalUsd = (Number(totalAtomic) / 1_000_000).toFixed(6);

  return {
    question,
    responseText,
    responseId,
    citations: matches,
    attribution,
    payments,
    totalPaidAtomic: totalAtomic,
    totalPaidUsd: totalUsd,
    durationMs: Date.now() - t0,
    scenario: inferScenario(question.text, matches),
  };
}

function inferScenario(question: string, matches: AgentAnswer["citations"]): string {
  const q = question.toLowerCase();
  if (q.includes("restak") || matches.some((m) => m.source.url.includes("satlayer") || m.source.url.includes("babylon"))) {
    return "bitcoin-restaking";
  }
  if (q.includes("creator") || matches.some((m) => m.source.url.includes("creatorconomy"))) {
    return "creator-economy";
  }
  if (q.includes("arc") || matches.some((m) => m.source.url.includes("arc.io"))) {
    return "agent-payments";
  }
  return "general";
}
