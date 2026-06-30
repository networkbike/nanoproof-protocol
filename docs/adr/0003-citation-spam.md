# ADR 0003: Citation Spam Mitigation

- **Status:** Proposed
- **Date:** 2026-06-30
- **Authors:** @networkbike

## Context and Problem Statement

The Citation Engine accepts AI responses as input. A malicious agent could submit responses that cite every registered source in the registry to drain creators' period caps. We need a defense that doesn't require a token or a centralized reputation oracle.

## Decision Drivers

- **Funds safety.** Creators must not lose money to spam.
- **Openness.** We cannot require KYC for agents.
- **Latency.** Defenses must run inside the standard 2s settlement path.

## Considered Options

1. **Confidence threshold τ only.**
2. **Per-agent per-source rate limits.**
3. **Optional proof-of-citation (signed statement that the citation was actually rendered).**

## Decision Outcome

**Chosen option:** **All three, with τ mandatory and the others opt-in per creator.**

- **Confidence threshold τ** — every CitationEngine implementation enforces τ (default 0.78). Sources with stricter matching get a higher τ.
- **Per-agent per-source rate limits** — creators can opt into a `maxCitationsPerAgentPerDay` cap.
- **Proof-of-citation** — creators can opt into requiring the agent to sign a statement that the citation was rendered to a real user session (judged by a session token TTL).

### Positive Consequences

- Defense in depth without a token.
- Creators choose their own risk tolerance.
- Every mitigation is enforceable by the protocol, not by humans.

### Negative Consequences

- Adds optional complexity to the engine and the API.
- Proof-of-citation shifts work to agents; some may refuse to integrate.

## Pros and Cons of the Options

### Option 1 — Threshold only

- ✅ Simple.
- ❌ Doesn't catch coordinated low-confidence spam.

### Option 2 — Rate limits

- ✅ Effective against the simple spam case.
- ❌ Cooldown doesn't address sudden spikes.

### Option 3 — Proof-of-citation

- ✅ Strongest defense.
- ❌ Operational burden for agents.

## References

- [`architecture.md`](../architecture.md#citation-spam-mitigation)
- [`protocol-spec.md`](../protocol-spec.md) — economic rules