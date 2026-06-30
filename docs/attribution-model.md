# Attribution Model

> How NanoProof turns a bag of citations into a weighted, auditable, payable allocation across creators.

---

## Table of contents

- [Why a model is needed](#why-a-model-is-needed)
- [Core concept](#core-concept)
- [Citation types](#citation-types)
- [Per-Citation scoring](#per-citation-scoring)
- [Response-level attribution](#response-level-attribution)
- [Weighting factors](#weighting-factors)
- [Score composition](#score-composition)
- [Final Creator allocation score](#final-creator-allocation-score)
- [Numerical guarantees](#numerical-guarantees)
- [Worked example](#worked-example)
- [Edge cases](#edge-cases)
- [Versioning](#versioning)
- [See also](#see-also)

---

## Why a model is needed

A response that cites 5 sources does not mean each source contributed equally. A response that *paraphrases* one source while *quoting* another should weight them differently. The attribution model turns raw citations into numbers — fractions of a USDC payout — that humans can audit and trust.

The model is deliberately **deterministic, documented, and versioned**. Anyone can replay a past Attribution by re-running the algorithm with the recorded evidence and get the same number.

---

## Core concept

For every AI response, the engine computes:

```
For each Citation c:
  rawScore[c] = w_cite × w_rel × w_conf × w_qual × w_diversity × w_recency × basePrice[c]

Then:
  contributionFraction[c] = rawScore[c] / Σ rawScore[c']    (over all c' in response)

Per Creator:
  creatorAttribution[creator] = Σ contributionFraction[c]  for every c whose source is owned by creator

Payout:
  payout[creator] = creatorAttribution[creator] × sourceQuote[c]
```

Every term is computed from observable evidence and recorded in the Citation row.

---

## Citation types

Every Citation is classified into exactly one of five types. The type drives the base weight (`w_cite`).

| Type | Definition | Example | Base weight |
|------|------------|---------|-------------|
| **DIRECT** | Quoted or near-verbatim text from the Source. | `In the words of Smith (2024), "…"` | **1.0** |
| **INDIRECT** | Clear paraphrase that retains meaning. | "Smith argues that the dataset is biased." | **0.7** |
| **SUPPORTING** | Cited as a reference / background but not relied on for the main claim. | "Prior work in this area includes [Smith 2024]." | **0.4** |
| **REFERENCE** | Listed in a bibliography or "see also" without being directly discussed. | "— Smith, J. (2024). Title." | **0.2** |
| **CONTEXT** | Mentioned in passing, no substantive use. | "Following the style popularized by Smith's blog…" | **0.1** |

Classification is performed by the Citation Extractor (`core/extractor.ts`) using a combination of:
- Structural cues (quote marks → DIRECT; parenthetical citation → REFERENCE; etc.)
- Embedding similarity between the cited span and the Source body
- Optional LLM-based classification when structural signals are ambiguous

Each Citation stores the classification rationale.

---

## Per-Citation scoring

For a Citation `c`, the **raw score** is:

```
rawScore[c] =
    w_cite(c.type)
  × w_rel(c)              // relevance to the user's query
  × w_conf(c)             // match confidence from the registry
  × w_qual(c)             // content quality signal
  × w_diversity(c)        // diversity bonus for fresh sources
  × w_recency(c)          // age-of-source decay
  × basePrice[c.sourceId] // Creator-set per-source price
```

Each `w_*` is a value in `[0, 1]` unless otherwise noted.

---

## Response-level attribution

After computing `rawScore` for every Citation in the response, the engine normalizes to fractions:

```
contributionFraction[c] = rawScore[c] / Σ rawScore[c']
```

By construction:

```
Σ contributionFraction[c]  =  1.0   (modulo floating-point rounding ≤ 1e-9)
```

A response citing 4 sources in DIRECT mode with equal weights will allocate `0.25 / 0.25 / 0.25 / 0.25` to each. A response with one DIRECT and three REFERENCE citations might allocate `0.625 / 0.125 / 0.125 / 0.125`.

---

## Weighting factors

### `w_rel` — Relevance

How relevant the cited span is to the user's query. Computed as the cosine similarity between the query embedding and the span embedding.

```
w_rel = clamp(0.2, cosine(queryEmb, spanEmb), 1.0)
```

A floor of 0.2 prevents truly-irrelevant matches from being zeroed out (sometimes a Source is cited precisely *because* it's tangentially relevant).

### `w_conf` — Confidence

The match confidence emitted by the registry matcher. Maps the multi-signal match score to a 0..1 value.

```
w_conf = clamp(0.0, matchScore, 1.0)
```

A high-precision URL match (score 1.0) yields `w_conf = 1.0`. An embedding-only match at the threshold (0.78) yields `w_conf = 0.78`.

### `w_qual` — Quality

A quality signal for the Source itself. Sourced from:
- Creator's reputation score (mapped via sigmoid).
- Verified Source status (`ACTIVE` only).
- Optional peer-review flag for academic Sources (Phase 6+).

```
w_qual = 0.5 + 0.5 × sigmoid(reputationScore / 100)
```

Default for new Creators: 0.5. High-rep Creators approach 1.0.

### `w_diversity` — Diversity bonus

A bonus applied to Sources the agent has not cited recently. Encourages breadth over echo-chamber behavior.

```
n_recent_citations = count of citations to this source in last 7 days, by this agent
w_diversity = 1.0 / (1.0 + log(1 + n_recent_citations))
```

First citation: 1.0. Tenth citation in a week: 0.41. Hundredth: 0.21.

### `w_recency` — Source age decay

Newer Sources get a modest bonus. Halflife = 365 days.

```
ageDays = max(0, now - source.createdAt) / (1000 * 60 * 60 * 24)
w_recency = 2^(-ageDays / 365)
```

A Source published today: 1.0. One year old: 0.5. Two years old: 0.25.

### `basePrice[c.sourceId]` — Creator's price

The atomic-unit price set by the Creator for their Source (default `"1000"` = $0.001 USDC). Used both for attribution magnitude and downstream payout quote.

---

## Score composition

Putting it together for a single Citation:

```typescript
function rawScore(c: Citation, queryEmb: number[], spanEmb: number[]): number {
  const w_cite = weights.cite[c.type];                 // 0.1..1.0
  const w_rel = clamp(0.2, cosine(queryEmb, spanEmb), 1);
  const w_conf = c.matchScore;                          // 0.0..1.0
  const w_qual = 0.5 + 0.5 * sigmoid(c.creator.reputationScore / 100);
  const w_diversity = 1 / (1 + Math.log(1 + c.agentRecentCitationCount));
  const w_recency = Math.pow(2, -c.sourceAgeDays / 365);

  return w_cite * w_rel * w_conf * w_qual * w_diversity * w_recency * c.basePrice;
}
```

The Citation row stores every component so the score is auditable.

---

## Final Creator allocation score

For a Creator `C` owning Sources `{s1, s2, …}` with Citations `{c1, c2, …}` in the response:

```
creatorAttribution[C] = Σ contributionFraction[c_i]
                        for every i such that Citation c_i.source.creatorId = C
```

If a Creator has multiple Citations in the same response (e.g. they wrote two chapters of an article), their total allocation is the sum of their contributions.

If a Source has co-authors or Organization membership, the Creator's allocation is then split per the Source's `pricing.splits[]` or the Organization's role policy.

```
payout[C] = creatorAttribution[C] × Σ basePrice[c_i]    for c_i owned by C
```

The Payment Engine (Phase 5) consumes this and signs the USDC transfer.

---

## Numerical guarantees

1. **Sum-to-one.** `Σ contributionFraction[c] = 1.0` (modulo 1e-9 rounding).
2. **Non-negative.** Every weight is ≥ 0; rawScore is ≥ 0.
3. **Bounded.** `rawScore ≤ basePrice[c]` for any c with `w_cite ≤ 1.0`.
4. **Deterministic.** Same inputs → same outputs (modulo floating-point precision).
5. **Audit-replayable.** All weights and component scores are stored; recomputation yields the same number.

---

## Worked example

**Scenario.** User asks "What is nanopayment routing on Arc?"

Agent response cites:
- **Source A:** arxiv paper on nanopayments (DIRECT quote)
- **Source B:** Canteen blog post on Arc routing (INDIRECT paraphrase)
- **Source C:** Circle docs on USDC (REFERENCE link)

Source prices: A=$0.005, B=$0.001, C=$0.0005.

Compute:

| Citation | w_cite | w_rel | w_conf | w_qual | w_div | w_rec | basePrice | rawScore |
|----------|--------|-------|--------|--------|-------|-------|-----------|----------|
| A (DIRECT)    | 1.0 | 0.95 | 0.98 | 0.7 | 1.0 | 0.95 | 5000 | 3,084 |
| B (INDIRECT)  | 0.7 | 0.88 | 0.86 | 0.6 | 1.0 | 1.0 | 1000 |   318 |
| C (REFERENCE) | 0.2 | 0.55 | 0.94 | 0.8 | 1.0 | 1.0 |  500 |    41 |

Sum = 3,443

**Fractions:**

- A: 3084 / 3443 = **89.6%**
- B: 318 / 3443 = **9.2%**
- C: 41 / 3443 = **1.2%**

If the agent's per-response cap is $0.05 USDC:

- A payout = 0.05 × 0.896 = **$0.0448**
- B payout = 0.05 × 0.092 = **$0.0046**
- C payout = 0.05 × 0.012 = **$0.0006**

Sum-to-one guaranteed. Each Citation row records its full raw score and components for audit.

---

## Edge cases

| Case | Behavior |
|------|----------|
| Single citation | `contributionFraction = 1.0` |
| Zero matching citations | Engine emits `Attribution { citations: [], totalPayoutUsdc: '0' }`; no payouts |
| All weights zero | Falls back to uniform allocation (each Citation gets `1/n`) |
| Source has co-authors | `creatorAttribution` splits per `pricing.splits[]` before payout |
| Source `PAUSED` after match | Citation stored but `payoutStatus = HELD` until Source `ACTIVE` |
| Multiple Citations to same Source | All Citations contribute independently to the Source's Creator |
| Source later disputed | Payouts held in escrow pending dispute resolution |
| Creator's reputation updates mid-flight | Use the Creator's reputation **at the time of Attribution** (recorded) |

---

## Versioning

The attribution model is versioned. Every Citation records the policy version (e.g. `am.v1.0.0`) used to compute it. When we change the model, we:

1. Bump the policy version.
2. Keep the old version's logic available for replay.
3. Replay all Citations under the new policy in a background job.
4. Compare old vs. new; surface deltas to Creators in the dashboard.

---

## See also

- [`citation-engine.md`](./citation-engine.md) — the pipeline that uses these scores
- [`fraud-prevention.md`](./fraud-prevention.md) — how the weights interact with anti-abuse signals
- [`protocol-spec.md`](./protocol-spec.md#33-citationevent)