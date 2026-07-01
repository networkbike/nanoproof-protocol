/**
 * Lightweight tokenizer + stopword filter for keyword-overlap citation
 * matching. Used by the research agent to score source relevance
 * without any ML embedding.
 */

const STOPWORDS = new Set<string>([
  "a", "an", "the", "and", "or", "but", "is", "are", "was", "were", "be",
  "been", "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "shall", "should", "may", "might", "must", "can", "could", "to", "of", "in",
  "for", "on", "with", "at", "by", "from", "as", "into", "this", "that",
  "these", "those", "i", "you", "he", "she", "it", "we", "they", "me", "him",
  "her", "us", "them", "my", "your", "his", "its", "our", "their", "what",
  "which", "who", "whom", "how", "why", "where", "when",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

export function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

/** Cosine similarity between two TF maps. */
export function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (const [k, v] of a.entries()) {
    aMag += v * v;
    if (b.has(k)) dot += v * (b.get(k) ?? 0);
  }
  for (const v of b.values()) bMag += v * v;
  if (aMag === 0 || bMag === 0) return 0;
  return dot / Math.sqrt(aMag * bMag);
}

/** Naive keyword overlap — proportion of query tokens found in source. */
export function keywordOverlap(queryTokens: string[], sourceTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const sourceSet = new Set(sourceTokens);
  let hits = 0;
  for (const qt of queryTokens) {
    if (sourceSet.has(qt)) hits += 1;
  }
  return hits / queryTokens.length;
}
