import { describe, it, expect } from "vitest";
import { tokenize, termFrequency, cosineSimilarity, keywordOverlap } from "../src/core/tokenize.js";

describe("tokenize", () => {
  it("lowercases + strips punctuation", () => {
    expect(tokenize("Hello, World!")).toEqual(["hello", "world"]);
  });

  it("filters stopwords", () => {
    expect(tokenize("the quick brown fox is fast")).not.toContain("the");
    expect(tokenize("the quick brown fox is fast")).not.toContain("is");
  });

  it("keeps alphanumerics + hyphens", () => {
    expect(tokenize("bitcoin-restaking EVM-2")).toContain("bitcoin-restaking");
    expect(tokenize("bitcoin-restaking EVM-2")).toContain("evm-2");
  });

  it("drops 1-char tokens", () => {
    expect(tokenize("a I")).toEqual([]);
  });
});

describe("termFrequency + cosineSimilarity", () => {
  it("returns 1 for identical maps", () => {
    const a = termFrequency(["bitcoin", "restaking"]);
    const b = termFrequency(["bitcoin", "restaking"]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
  });

  it("returns 0 for disjoint", () => {
    const a = termFrequency(["bitcoin"]);
    const b = termFrequency(["ethereum"]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });
});

describe("keywordOverlap", () => {
  it("computes proportion of query tokens found in source", () => {
    const query = tokenize("bitcoin restaking satlayer");
    const source = tokenize("satlayer builds meta-layer for bitcoin restaking");
    const overlap = keywordOverlap(query, source);
    expect(overlap).toBeCloseTo(1.0, 5); // all 3 query tokens appear
  });

  it("zero overlap", () => {
    const query = tokenize("ethereum staking");
    const source = tokenize("bitcoin restaking");
    expect(keywordOverlap(query, source)).toBe(0);
  });

  it("partial overlap", () => {
    const query = tokenize("bitcoin restaking ethereum defi");
    const source = tokenize("bitcoin restaking tutorial");
    // 2 of 4 query tokens (bitcoin, restaking) appear in the source
    expect(keywordOverlap(query, source)).toBeCloseTo(2 / 4, 5);
  });
});
