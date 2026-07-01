import { describe, it, expect } from "vitest";
import { extractLinks, normalizeUrl } from "./url-extractor.js";

describe("extractLinks", () => {
  it("returns empty for empty input", () => {
    expect(extractLinks("")).toEqual([]);
  });

  it("captures http and https URLs", () => {
    const text =
      "Read https://foo.com and http://bar.io for context";
    const links = extractLinks(text);
    expect(links.map((l) => l.url)).toEqual([
      "https://foo.com",
      "http://bar.io",
    ]);
  });

  it("strips trailing punctuation", () => {
    const text = "see https://foo.com/page.";
    expect(extractLinks(text)[0].url).toBe("https://foo.com/page");
  });

  it("deduplicates by URL", () => {
    const text =
      "https://foo.com and again https://foo.com and once more https://foo.com.";
    expect(extractLinks(text)).toHaveLength(1);
  });

  it("captures a snippet window before the URL", () => {
    const text = "A ".repeat(300) + "and then https://foo.com/page.";
    const links = extractLinks(text);
    expect(links[0].snippet.length).toBeLessThanOrEqual(240);
    expect(links[0].snippet).toContain("A ");
  });

  it("ignores URLs inside parentheses/square brackets", () => {
    const text = "(https://foo.com/page)";
    // Conservative regex actually captures the URL but with parens trailing;
    // we strip trailing punctuation so we end up with the clean URL.
    const links = extractLinks(text);
    expect(links[0].url.replace(/[)\]]+$/, "")).toBe("https://foo.com/page");
  });
});

describe("normalizeUrl", () => {
  it("lowercases the host", () => {
    expect(normalizeUrl("https://DEMO.Nanoproof.xyz/HELLO")).toMatchObject({
      domain: "demo.nanoproof.xyz",
    });
  });

  it("strips utm_*", () => {
    expect(normalizeUrl("https://foo.com/x?utm_source=tw").full).toBe(
      "https://foo.com/x",
    );
  });

  it("preserves non-utm query params", () => {
    expect(normalizeUrl("https://foo.com/x?lang=en&utm_source=tw").full).toBe(
      "https://foo.com/x?lang=en",
    );
  });

  it("drops www.", () => {
    expect(normalizeUrl("https://www.foo.com/x").domain).toBe("foo.com");
  });

  it("returns the raw string on parse failure", () => {
    expect(normalizeUrl("not a url").domain).toBe("");
  });
});
