# Cross-cutting Architecture Notes

> Architecture-level decisions that don't fit in the per-layer sections of [`ARCHITECTURE.md`](../ARCHITECTURE.md).

---

## Topics

- [Protocol portability](#protocol-portability)
- [Citation spam mitigation](#citation-spam-mitigation)
- [Per-agent pricing](#per-agent-pricing)
- [Wallet key management](#wallet-key-management)

---

## Protocol portability

**Status:** Open (see [ADR 0001](./adr/0001-chain-portability.md)).

NanoProof settles on Arc today. The question is whether the spec should require Arc or describe a portable shape that any sufficiently fast + cheap chain can implement.

**Trade-offs:**
- **Arc-only** keeps the spec simple, leans into the Lepton partnership, and ships faster.
- **Portable** unlocks adoption from Tempo, Base, and any future chain, at the cost of testing surface.

Current decision (provisional): **Arc-only at v1.0**, portable at v2.0 once we have a second production-grade partner chain.

---

## Citation spam mitigation

**Status:** Open (see [ADR 0003](./adr/0003-citation-spam.md)).

The Citation Engine must resist adversarial inputs that try to drain a creator's payouts by spamming low-quality citations.

**Mitigations under consideration:**
- Confidence threshold τ per source (default 0.78).
- Per-agent per-source rate limits.
- Per-period caps set by the creator.
- Reputation scores for agent wallets.
- Optional **proof-of-citation** — agent submits a signed statement that the citation was actually rendered to a real user.

The spec will specify the mitigations that **must** be supported by every conformant implementation.

---

## Per-agent pricing

**Status:** Open (see [ADR 0004](./adr/0004-per-agent-pricing.md)).

Should creators be able to set per-agent pricing (e.g. charge LLM-A more than LLM-B)?

**Arguments for:**
- Some agents cite more aggressively than others; pricing should reflect the value to the agent's user.
- Reputation systems become meaningful when pricing reflects trust.

**Arguments against:**
- Adds complexity to the pricing formula.
- Discriminatory pricing can be misused.

Current decision (provisional): **v1.0 supports a single per-source price**. v1.1 introduces optional per-agent pricing for sources that opt in.

---

## Wallet key management

**Status:** Open (see [ADR 0005](./adr/0005-wallet-key-management.md)).

The agent hot wallet signs every PaymentIntent execution. In production, this private key must be HSM-backed or MPC-distributed.

**Options under evaluation:**
- **Vercel/Railway env vars** — simple, acceptable for Lepton.
- **AWS KMS / GCP KMS** — better, requires integration work.
- **Fireblocks / Turnkey** — best, but adds a vendor.
- **Self-hosted Lit Protocol** — open, but operational burden.

Current decision (provisional): **env vars for Lepton**, **KMS or MPC for public beta (Phase 9)**.

---

## See also

- [`ARCHITECTURE.md`](../ARCHITECTURE.md) — the canonical architecture doc
- [`adr/`](./adr/) — the formal decision records
- [`protocol-spec.md`](./protocol-spec.md) — the wire spec