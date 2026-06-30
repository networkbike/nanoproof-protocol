# Arc-Native Settlement

> How NanoProof settles USDC nanopayments on Arc L1. The rail that turns Citation Events into onchain payouts.

---

## Table of contents

- [Why Arc](#why-arc)
- [Why USDC](#why-usdc)
- [Arc primitives we use](#arc-primitives-we-use)
- [Settlement architecture](#settlement-architecture)
- [x402 protocol integration](#x402-protocol-integration)
- [Circle Gateway batching](#circle-gateway-batching)
- [Onchain transactions](#onchain-transactions)
- [Finality + receipts](#finality--receipts)
- [RPC strategy](#rpc-strategy)
- [Smart contract surface](#smart-contract-surface)
- [Faucet + devnet workflow](#faucet--devnet-workflow)
- [Migration to chain-portable (v2.0)](#migration-to-chain-portable-v20)
- [See also](#see-also)

---

## Why Arc

Arc is Circle's stablecoin-native L1. We chose it because:

1. **USDC-native gas.** No separate volatile gas token. We pay gas in USDC, which creators already understand.
2. **Sub-second finality.** <500ms typical. Settlement feels instant.
3. **Sub-cent fees.** ~$0.01 per transaction. Affordable even for nano-value.
4. **Circle Agent Stack.** First-class primitives for AI agents (USDC, CCTP, Gateway, App Kit).
5. **Hackathon partner.** Circle + Canteen are running the Lepton Hackathon on Arc — alignment with the ecosystem.

Trade-offs accepted:
- Newer chain (less battle-tested than Ethereum mainnet).
- Single-chain commitment at v1.0 (chain portability deferred to v2.0 per ADR-0001).
- Testnet today, mainnet post-hackathon.

---

## Why USDC

1. **Stable.** Creators receive predictable value.
2. **Native to Arc.** No wrapping required.
3. **Universal agent primitive.** The default currency for machine-to-machine payments.
4. **6 decimals.** Sufficient resolution for sub-cent amounts (`1000` atomic = $0.001).
5. **Circle-issued.** Strong regulatory and compliance backing.

We never accept wrapped variants, bridged USDC, or alternative stablecoins.

---

## Arc primitives we use

| Arc primitive | NanoProof usage |
|---------------|-----------------|
| **Native USDC** | Settlement currency for all payouts |
| **Native USDC gas** | Every transaction's gas paid in USDC |
| **EVM execution** | viem-based client (`arcClient`) |
| **RPC** | Public + private endpoints for read/write |
| **ArcScan** | Receipt verification, block explorer |
| **Faucet** | Devnet USDC for testing |

---

## Settlement architecture

```
                    PAYMENT ENGINE
                          │
                          ▼
              ┌───────────────────────┐
              │  1. Batch via Gateway │   Circle Gateway (offchain coordination)
              └──────────┬────────────┘
                         ▼
              ┌───────────────────────┐
              │  2. Submit batch      │   Arc RPC (signed transaction)
              └──────────┬────────────┘
                         ▼
              ┌───────────────────────┐
              │  3. Arc L1 finality   │   <500ms
              └──────────┬────────────┘
                         ▼
              ┌───────────────────────┐
              │  4. ArcScan index     │   Receipt viewable
              └──────────┬────────────┘
                         ▼
              ┌───────────────────────┐
              │  5. Receipt mirror    │   Indexer → dashboard
              └───────────────────────┘
```

The Payment Engine never custodies creator funds beyond the batching window. From the moment of Arc finality, USDC lives in the Creator's vault (or the destination specified by splits).

---

## x402 protocol integration

[x402](https://www.x402.org/) is the open standard for HTTP-native payments (HTTP 402 "Payment Required"). We use x402 as the **offchain auth layer** for every PaymentIntent.

### x402 envelope shape

```
x402 Envelope:
  challenge:  HTTP 402 Payment Required
  resource:   nanoproof://payment-intents/<id>
  quote:      {
                paymentIntentId,
                totalAtomic,
                feeAtomic,
                netAtomic,
                payouts: [{ vaultId, amountAtomic, splitsHash }],
                validUntil
              }
  payer:      <agent hot wallet address>
  payees:     [<vault address>, ...]
  amount:     totalAtomic
  currency:   USDC
  signature:  EIP-712 over (
                resource, quote, payer, payees,
                amount, currency, validUntil
              )
```

### Why wrap in x402

1. **Standard tooling.** Off-the-shelf x402 SDKs can read our receipts.
2. **Cross-protocol composition.** Other x402-aware agents/services can verify our payouts.
3. **Portable auth layer.** The offchain signature works regardless of which chain settles.
4. **Smart contract wallets.** x402-aware contracts can react to NanoProof payouts programmatically.

### Validation

The Payment Engine validates every inbound x402 envelope:
- Signature recovers the agent's hot wallet address.
- `validUntil > now`.
- `amount == totalAtomic` (no tampering).
- `payees` matches the PaymentIntent's destination list.

---

## Circle Gateway batching

**Circle Gateway** is Circle's primitive for batching many USDC transfers into a single onchain transaction.

### Benefits

| Benefit | Description |
|---------|-------------|
| **Gas amortization** | 1000 transfers ≈ $0.01 total gas. Per-payout gas: ~$0.00001 |
| **Atomicity** | Either all transfers settle or none do |
| **Throughput** | Up to 1000 transfers per batch; sequential batches scale linearly |
| **Composability** | Gateway batches include arbitrary calldata, enabling x402 envelope inclusion |

### Batch structure

```typescript
type GatewayBatch = {
  batchId: string;                    // Gateway-assigned UUID
  payouts: GatewayPayout[];
  feeAtomic: string;                  // protocol fee, paid to treasury
  totalAtomic: string;                // sum of all payouts + fee
  signature: `0x${string}`;           // Gateway-issued signature
  submittedAt: string;
};

type GatewayPayout = {
  recipient: `0x${string}`;           // vault address
  amountAtomic: string;               // USDC (6 decimals)
  memo: string;                       // x402 resource URI
};
```

### Failure modes

| Failure | Behavior |
|---------|----------|
| Gateway timeout | Retry once; on second timeout, fall back to direct Arc settlement via viem |
| Gateway rejection | Mark PaymentIntent `FAILED`; surface to agent dashboard |
| Partial settlement | Gateway is atomic; partials don't occur |

---

## Onchain transactions

### Standard payout transaction

```
USDC.transfer(agentHotWallet, vaultAddress, amount)
```

For batched payouts, the onchain transaction is a single multi-call:

```
USDC.transfer(agentHotWallet, vault1, amount1)
USDC.transfer(agentHotWallet, vault2, amount2)
...
USDC.transfer(treasuryVault, protocolFee, fee)
```

Wrapped in Circle Gateway's batch executor contract.

### Transaction anatomy

```jsonc
{
  "to": "<USDC contract>",
  "value": "0",
  "data": "0xa9059cbb... <calldata for transfer>",
  "gasLimit": "<estimated>",
  "maxFeePerGas": "<from Arc gas oracle>",
  "maxPriorityFeePerGas": "0",
  "nonce": "<agent hot wallet nonce>",
  "chainId": "<Arc chain id>"
}
```

The Payment Engine uses viem's `prepareTransactionRequest` + `sendTransaction` + `waitForTransactionReceipt`.

### Gas estimation

```
gas_per_transfer = ~65,000 gas units
gas_per_batch    = 65,000 * N + 21,000 (tx overhead)
gas_price_usdc   = ~$0.00001 per gas unit (Arc native USDC)
batch_cost_1000  = ~$0.005 + protocol overhead
```

---

## Finality + receipts

Arc's finality is **<500ms** (typical). We confirm finality via:

```typescript
const receipt = await arcClient.waitForTransactionReceipt({
  hash: txHash,
  confirmations: 1,        // 1 block ≈ <500ms on Arc
});

if (receipt.status === 'success') {
  // Settlement confirmed; emit payment.settled
} else {
  // Reverted; mark PaymentIntent FAILED
}
```

### Receipt content

```typescript
type OnchainReceipt = {
  txHash: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: number;
  blockHash: `0x${string}`;
  from: `0x${string}`;                  // agent hot wallet
  to: `0x${string}`;                   // USDC contract (or Gateway batch executor)
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  status: 'success' | 'reverted';
  logs: ParsedEventLog[];               // USDC.Transfer events
};
```

Every onchain Receipt is parsed, its USDC `Transfer` events extracted, and mirrored to a `Receipt` row in Postgres.

---

## RPC strategy

### Primary

Canteen-hosted Arc testnet RPC (per the Lepton Hackathon). High availability, no rate limit.

### Backup

Public Arc RPC. Lower reliability, may rate-limit under load.

### Failover logic

```typescript
async function sendTransaction(tx: Transaction): Promise<OnchainReceipt> {
  const providers = [primaryRpc, backupRpc];
  let lastError: Error | undefined;

  for (const rpc of providers) {
    try {
      const client = createPublicClient({ transport: http(rpc.url) });
      const hash = await client.sendTransaction({ ...tx, account });
      return await client.waitForTransactionReceipt({ hash });
    } catch (err) {
      lastError = err as Error;
      log.warn(`RPC ${rpc.url} failed; trying next`, { err });
    }
  }
  throw new RpcExhaustedError(lastError);
}
```

### Read strategy

- Hot path: primary RPC.
- Analytics queries: read replicas (Neon branching provides logical read replicas).
- Receipt confirmation: primary only.

---

## Smart contract surface

The Payment Engine interacts with two contracts on Arc:

### USDC contract

Standard ERC-20 with native gas extensions (per Arc's USDC deployment).

```solidity
interface IUSDC {
  function transfer(address to, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
  function decimals() external view returns (uint8);
}
```

### Circle Gateway batch executor

Circle's contract that batches N transfers into one tx:

```solidity
interface IGateway {
  function execute(Batch calldata batch) external returns (bool);
}

struct Batch {
  address[] recipients;
  uint256[] amounts;
  string[] memos;
}
```

### Custom contracts (Phase 7)

NanoProof deploys two custom contracts:

- **`CitationReceipt.sol`** — emits a `CitationPaid(sourceId, agentId, amount, txHash)` event per payout. Indexable via ArcScan.
- **`PaymentRouter.sol`** — distributes USDC from agent escrow to creator wallets with per-source splits. Optional escrow path.

These are documented in [`../contracts/PaymentRouter.sol`](../contracts/) and [`../contracts/CitationReceipt.sol`](../contracts/).

---

## Faucet + devnet workflow

During Lepton development:

```bash
# Install Canteen's Arc CLI
uv tool install git+https://github.com/the-canteen-dev/ARC-cli

# Get testnet RPC + faucet info
arc faucet <your-address>

# Install Circle CLI
npm install -g @circle-fin/cli

# Fund a testnet USDC wallet
circle faucet --network arc-testnet --address <your-address>
```

The Payment Engine reads the agent's hot-wallet address from `PE_AGENT_HOT_WALLET_ADDRESS` and the corresponding private key from `PE_AGENT_HOT_WALLET_PRIVATE_KEY` (or KMS in Phase 9).

---

## Migration to chain-portable (v2.0)

Per [ADR-0001](./adr/0001-chain-portability.md), v2.0 introduces chain portability. Migration requires:

1. **Chain-agnostic USDC contract** — abstract over a `IUSDC` interface; deploy per chain.
2. **Chain-aware Gateway** — Circle Gateway may not exist on every chain; provide a fallback viem-based batch executor.
3. **Address normalization** — EVM addresses are 0x-prefixed 20 bytes everywhere; no work needed.
4. **Receipt schema extension** — Receipt rows carry `chainId` + `chainName`.
5. **API version bump** — `/v2/payments/*` with the new schema.

For now, v1.0 ships Arc-only. v2.0 ships portable.

---

## See also

- [`payment-engine.md`](./payment-engine.md)
- [`arcscan-verification.md`](./arcscan-verification.md)
- [`treasury-management.md`](./treasury-management.md)
- [`payout-workflows.md`](./payout-workflows.md)
- [`../docs/adr/0001-chain-portability.md`](../docs/adr/0001-chain-portability.md)