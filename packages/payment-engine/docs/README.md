# `docs/` — Subpackage Documentation

> Implementation-level design notes. Anything in this folder is **implementation reference**; the protocol-level specs live at the repo root in `docs/`.

## Files

| File | Purpose |
|------|---------|
| `x402-envelope-evolution.md` | How our x402 envelope shape may evolve. |
| `arc-client-failover.md` | Primary/backup RPC failover details. |
| `gateway-vs-direct-settlement.md` | When to use Gateway batching vs direct viem. |
| `hash-chain-design.md` | Why hash chains + how to extend them. |
| `receipt-replay-tool.md` | CLI tool design for `/scripts/replay-receipt.ts`. |
| `multisig-payout-vault.md` | Safe vault verification pattern. |
| `clawback-cooperation.md` | Cooperative clawback flow. |
| `fee-tier-evaluation.md` | Tier evaluation cron details. |

## When to add to this folder

- When a subpackage needs a design decision that affects > 1 file in this package.
- When a tradeoff is non-obvious and you want the next maintainer to understand the choice.
- When a future Phase depends on a specific decision made here.

## When **not** to add to this folder

- Protocol-level decisions belong at the repo root in `docs/`.
- One-off implementation notes belong in code comments or commit messages.

## See also

- [`../../../docs/payment-engine.md`](../../../docs/payment-engine.md)
- [`../../../docs/settlement-arc.md`](../../../docs/settlement-arc.md)
- [`../../../docs/treasury-management.md`](../../../docs/treasury-management.md)