import type { CitationMatch } from "./types.js";
import { type DemoSource, demoCreators, demoSources } from "../data/demo-sources.js";
import { keywordOverlap, tokenize } from "../core/tokenize.js";

/**
 * Lightweight citation matcher — keyword overlap against the demo dataset.
 *
 * Phase 5 P3 thin-slice will replace this with the real Phase 3 Citation
 * Engine (embeddings + fingerprint match). For the Lepton demo, keyword
 * overlap is enough to surface the right 2-3 sources per question.
 */

const MAX_MATCHES = 3;

export function matchSources(question: string, sources: DemoSource[] = demoSources): CitationMatch[] {
  const queryTokens = tokenize(question);
  if (queryTokens.length === 0) return [];

  const scored = sources
    .map((s) => {
      const haystack = `${s.title} ${s.description} ${s.keywords.join(" ")}`;
      const haystackTokens = tokenize(haystack);
      const overlap = keywordOverlap(queryTokens, haystackTokens);
      return { source: s, score: overlap };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCHES);

  if (scored.length === 0) return [];

  // Distribute 60/25/15 contribution (round 1 of part 6).
  const SLICES = [0.6, 0.25, 0.15];

  return scored.map((row, i) => {
    const creator = demoCreators.find((c) => c.username === row.source.creatorUsername);
    return {
      source: {
        sourceId: `src_${slug(row.source.url)}`,
        creatorId: `cr_${row.source.creatorUsername}`,
        creatorName: creator?.name ?? row.source.author,
        creatorUsername: row.source.creatorUsername,
        title: row.source.title,
        url: row.source.url,
        domain: new URL(row.source.url).hostname.replace(/^www\./, ""),
        citationPrice: row.source.citationPrice,
      },
      score: Number(row.score.toFixed(4)),
      contributionPct: Math.round((SLICES[i] ?? 0) * 100),
      snippet: makeSnippet(question, row.source),
    } satisfies CitationMatch;
  });
}

function slug(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "_")
    .toLowerCase()
    .slice(0, 24);
}

function makeSnippet(question: string, source: DemoSource): string {
  const prefix = question.length > 80 ? `${question.slice(0, 80)}…` : question;
  return `${prefix} — see ${source.title}`;
}
