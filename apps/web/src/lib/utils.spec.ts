import { describe, it, expect } from "vitest";
import {
  cn,
  formatCount,
  formatPct,
  formatRelative,
  formatUsd,
  formatUsdCompact,
  truncateAddress,
} from "./utils";

describe("lib/utils", () => {
  it("formatUsd handles atomic USDC strings", () => {
    expect(formatUsd("0")).toBe("0.000000");
    expect(formatUsd("1000000")).toBe("1.000000");
    expect(formatUsd("1500000")).toBe("1.500000");
    expect(formatUsd("123456789012345")).toBe("123456789.012345");
  });

  it("formatUsdCompact switches at $1k / $1M", () => {
    expect(formatUsdCompact("0")).toBe("$0.000000");
    expect(formatUsdCompact("1000000")).toBe("$1.00"); // 1 USDC
    expect(formatUsdCompact("1500000000")).toBe("$1.50k"); // 1500 USDC
    expect(formatUsdCompact("5000000000000")).toBe("$5.00M"); // 5M USDC
  });

  it("formatCount uses en-US grouping", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(1000)).toBe("1,000");
    expect(formatCount(1_500_000)).toBe("1,500,000");
  });

  it("formatPct is bounded to digits", () => {
    expect(formatPct(0.5)).toBe("50.0%");
    expect(formatPct(0.1234, 2)).toBe("12.34%");
    expect(formatPct(1)).toBe("100.0%");
    expect(formatPct(0)).toBe("0.0%");
  });

  it("formatRelative copes with near-now", () => {
    expect(formatRelative(new Date().toISOString())).toBe("just now");
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatRelative(fiveMinAgo)).toBe("5m ago");
  });

  it("truncateAddress preserves head + tail", () => {
    expect(truncateAddress("0x1234567890abcdef")).toBe("0x1234…cdef");
    expect(truncateAddress("0x123456")).toBe("0x123456");
  });

  it("cn merges Tailwind classes with last-wins semantics", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", false && "text-blue-500", undefined, "text-green-500")).toBe("text-green-500");
  });
});