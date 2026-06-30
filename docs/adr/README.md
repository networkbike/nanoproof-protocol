# Architecture Decision Records (ADRs)

> Significant architectural decisions for the NanoProof Protocol, recorded in the [MADR](https://adr.github.io/madr/) format.

---

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](./0001-chain-portability.md) | Protocol portability across chains | Proposed |
| [0002](./0002-dependency-policy.md) | Dependency policy | Accepted |
| [0003](./0003-citation-spam.md) | Citation spam mitigation | Proposed |
| [0004](./0004-per-agent-pricing.md) | Per-agent pricing | Proposed |
| [0005](./0005-wallet-key-management.md) | Wallet key management | Proposed |

---

## How to write an ADR

1. Copy [`_template.md`](./_template.md) to `NNNN-short-name.md`.
2. Fill in the context, decision, consequences, and alternatives.
3. Open a PR with the `adr` label.
4. After review, the maintainers either Accept or Reject. Status moves to the index.

Once Accepted, an ADR is **immutable**. If we change our mind, we write a new ADR that supersedes it.

---

## Why MADR?

We use the MADR format because it forces us to capture both the decision and the alternatives we considered, with explicit trade-offs. This makes future "why did we do this again?" archaeology trivial.