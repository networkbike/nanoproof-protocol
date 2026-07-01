import { describe, it, expect } from "vitest";
import { matchSources } from "../src/research/matcher.js";
import { synthesizeAnswer } from "../src/research/answer.js";
import { buildAttribution } from "../src/attribution/attribution.js";

describe("matchSources", () => {
  it("returns empty for empty query", () => {
    expect(matchSources("")).toEqual([]);
  });

  it("surfaces SatLayer + Babylon for a Bitcoin restaking question", () => {
    const matches = matchSources("How does Bitcoin restaking work with SatLayer?");
    const urls = matches.map((m) => m.source.url);
    expect(urls.some((u) => u.includes("satlayer"))).toBe(true);
    expect(urls.some((u) => u.includes("babylon"))).toBe(true);
  });

  it("applies the 60/25/15 contribution split", () => {
    const matches = matchSources("bitcoin restaking satlayer babylon");
    expect(matches[0].contributionPct).toBe(60);
    expect(matches[1].contributionPct).toBe(25);
    expect(matches[2].contributionPct).toBe(15);
  });

  it("limits to top 3 matches", () => {
    const matches = matchSources("bitcoin restaking satlayer babylon arc usdc");
    expect(matches.length).toBeLessThanOrEqual(3);
  });
});

describe("synthesizeAnswer", () => {
  it("renders a 'no sources' message for empty matches", () => {
    const text = synthesizeAnswer("xyzzy noop query", []);
    expect(text).toMatch(/couldn't find/i);
  });

  it("embeds source URLs as Markdown links", () => {
    const matches = matchSources("Bitcoin restaking satlayer");
    const text = synthesizeAnswer("Bitcoin restaking satlayer", matches);
    expect(text).toMatch(/https?:\/\/docs\.satlayer\.xyz/);
  });
});

describe("buildAttribution", () => {
  it("sums atomic payouts across matches by creator", () => {
    const matches = matchSources("Bitcoin restaking satlayer");
    const attr = buildAttribution(matches);
    expect(attr.length).toBeGreaterThan(0);
    for (const a of attr) {
      expect(BigInt(a.payoutAtomic)).toBeGreaterThan(0n);
      expect(a.contributionPct).toBeGreaterThan(0);
    }
  });
});
