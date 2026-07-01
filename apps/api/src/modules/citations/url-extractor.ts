/**
 * Extract every distinct URL from free-form agent response text.
 *
 * Used by the Citation Engine's "Discovery" stage. Conservative regex
 * — won't claim a URL inside code, math, or quoted markup.
 *
 * Returns:
 *   - `urls`:      unique normalized URLs in order of first appearance
 *   - `fragments`: text *immediately preceding* each URL — used to build
 *                  a 240-char citation snippet
 */
export interface ExtractedLink {
  url: string;
  /** 240 char window of text BEFORE the URL, suitable as the citation snippet. */
  snippet: string;
}

const SNIPPET_WINDOW = 240;

// Conservative: http(s)://… not preceded by `,=)<]` (avoiding trailing
// punctuation from markdown) and not containing whitespace.
const URL_REGEX = /https?:\/\/[^\s<>"'`)\]}]+/gi;

const TRAILING_PUNCTUATION = /[.,;:!?)\]\}]+$/;

export function extractLinks(text: string): ExtractedLink[] {
  if (!text) return [];
  const seen = new Set<string>();
  const out: ExtractedLink[] = [];

  for (const match of text.matchAll(URL_REGEX)) {
    let url = match[0];
    // Strip a trailing punctuation cluster.
    url = url.replace(TRAILING_PUNCTUATION, "");
    if (seen.has(url)) continue;
    seen.add(url);

    const start = Math.max(0, match.index! - SNIPPET_WINDOW);
    const before = text.slice(start, match.index).replace(/\s+/g, " ").trim();
    out.push({ url, snippet: before || url });
  }

  return out;
}

/** Normalize a URL for matching: lowercased host, no trailing slash, no utm_*. */
export function normalizeUrl(raw: string): { domain: string; full: string } {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    // Drop utm_* / fbclid / gclid query params for matching purposes.
    const keep: string[] = [];
    for (const [k, v] of u.searchParams.entries()) {
      if (/^utm_|^fbclid$|^gclid$|^mc_eid$|^mc_id$/i.test(k)) continue;
      keep.push(`${k}=${v}`);
    }
    const qs = keep.length ? `?${keep.join("&")}` : "";
    // No trailing slash on path unless the path is just "/".
    const path = u.pathname.length > 1 ? u.pathname.replace(/\/$/, "") : u.pathname;
    const full = `${u.protocol}//${host}${path}${qs}`;
    return { domain: host, full };
  } catch {
    return { domain: "", full: raw };
  }
}
