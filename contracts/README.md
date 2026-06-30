# NanoProof Smart Contracts

> Solidity contracts that anchor NanoProof receipts on Arc L1.

[![Stack: Solidity](https://img.shields.io/badge/Solidity-0.8.x-363636.svg)](https://soliditylang.org)
[![Tooling: Foundry](https://img.shields.io/badge/Foundry-latest-000000.svg)](https://book.getfoundry.sh)

---

## Status

**Phase 7 — Arc Integration** (planned). The contract surface is sketched here. Implementation lands in Phase 7 of the [Roadmap](../ROADMAP.md).

---

## Contracts

| Contract | Purpose |
|----------|---------|
| `CitationRegistry.sol` | Onchain anchor for Source fingerprints and ownership claims |
| `PaymentRouter.sol` | Distributes USDC from agent escrow to creator wallets, with per-source splits |
| `CitationReceipt.sol` | Emits `CitationPaid(sourceId, agentId, amount, txHash)` per payout |
| `MockUSDC.sol` | Testnet USDC for local + testnet integration (deploy only to testnets) |

---

## Design principles

1. **Minimal onchain surface.** Most logic stays offchain. Contracts exist for verifiable settlement, not business logic.
2. **USDC only.** No wrapped assets, no native gas token dependence.
3. **Immutable in v1.** V2 introduces a proxy if protocol governance demands it.
4. **Emergency pause owned by a 3-of-5 multisig** (deploying in Phase 7).

---

## Tooling

- **Foundry** — `forge`, `cast`, `anvil`, `chisel`
- **OpenZeppelin** — base contracts (ERC20, Ownable, ReentrancyGuard)
- **Arc L1** — deployment target

---

## Local development (planned)

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Build
forge build

# Test
forge test

# Deploy to Arc testnet
forge script script/Deploy.s.sol --rpc-url $ARC_RPC_URL --broadcast
```

---

## Folder structure (planned)

```
contracts/
├── src/
│   ├── CitationRegistry.sol
│   ├── PaymentRouter.sol
│   ├── CitationReceipt.sol
│   ├── MockUSDC.sol
│   └── interfaces/
├── test/
│   ├── CitationRegistry.t.sol
│   ├── PaymentRouter.t.sol
│   └── fixtures/
├── script/
│   ├── Deploy.s.sol
│   └── Verify.s.sol
├── foundry.toml
└── README.md
```

---

## See also

- [`../docs/architecture.md`](../docs/architecture.md#layer-7--smart-contract-layer)
- [`../ROADMAP.md`](../ROADMAP.md#phase-7--arc-integration)
- [`../docs/adr/0001-chain-portability.md`](../docs/adr/0001-chain-portability.md)