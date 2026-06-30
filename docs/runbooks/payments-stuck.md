# Runbook: Payment Processor Stuck

## Trigger

- BullMQ queue `payments` depth > 1000 for >5 minutes.
- PaymentIntent in `pending` status for >2 minutes.
- Agent dashboard reporting "Payment delayed" errors.

## Triage

1. Check the queue depth: `pnpm --filter @nanoproof/api queue:status`.
2. Check Circle Gateway status: <https://status.circle.com>
3. Check Arc RPC: `curl $ARC_RPC_URL -X POST -d '{"jsonrpc":"2.0","method":"eth_blockNumber","id":1}'`.
4. Check agent wallet balance: `pnpm --filter @nanoproof/api wallet:balance`.

## Common causes

- **Agent wallet out of USDC.** Top it up via the Arc faucet (testnet) or Circle (mainnet).
- **Circle Gateway rate-limited.** Backoff and retry; check their status page for current limits.
- **Arc RPC throttled.** Failover to a backup RPC in `infra/arc.ts`.
- **Smart contract revert.** Inspect the txHash on ArcScan; the receipt's `failureReason` field will say why.

## Mitigation

```bash
# Pause the queue (stops new intents from being processed)
pnpm --filter @nanoproof/api queue:pause

# Drain stuck intents once root cause is fixed
pnpm --filter @nanoproof/api queue:resume

# Or force-retry specific intents
pnpm --filter @nanoproof/api payments:retry --intent <id>
```

## Escalation

- Same path as [`api-down.md`](./api-down.md).

## Postmortem

Same as [`api-down.md`](./api-down.md), with an extra line item for any creator balances that need reconciliation.