import type { Attribution, CitationMatch } from "../types/agent.js";

const USDC_DECIMALS = 6;
const USDC_ATOMIC_PER_USD = 1_000_000n;

function atomicUsdToDisplay(atomic: string): string {
  const big = BigInt(atomic);
  const whole = big / USDC_ATOMIC_PER_USD;
  const frac = big % USDC_ATOMIC_PER_USD;
  return `${whole}.${frac.toString().padStart(USDC_DECIMALS, "0")}`;
}

/**
 * Build per-creator Attribution rows from the matches.
 *
 * The 60/25/15 split is set on the match rows by `matchSources`. We
 * aggregate across matches so a creator who is cited by multiple sources
 * (rare in the demo, possible in production) sums their percentages.
 */
export function buildAttribution(matches: CitationMatch[]): Attribution[] {
  const byCreator = new Map<string, Attribution>();

  for (const m of matches) {
    const price = BigInt(m.source.citationPrice);
    const existing = byCreator.get(m.source.creatorId);
    if (existing) {
      const newPayout = BigInt(existing.payoutAtomic) + price;
      byCreator.set(m.source.creatorId, {
        ...existing,
        contributionPct: existing.contributionPct + m.contributionPct,
        payoutAtomic: newPayout.toString(),
        payoutUsd: atomicUsdToDisplay(newPayout.toString()),
      });
    } else {
      byCreator.set(m.source.creatorId, {
        sourceId: m.source.sourceId,
        creatorId: m.source.creatorId,
        creatorName: m.source.creatorName,
        creatorUsername: m.source.creatorUsername,
        contributionPct: m.contributionPct,
        payoutAtomic: price.toString(),
        payoutUsd: atomicUsdToDisplay(price.toString()),
      });
    }
  }

  return Array.from(byCreator.values()).sort((a, b) => b.contributionPct - a.contributionPct);
}
