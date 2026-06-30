# Runbook: Arc RPC Failure

## Trigger

- Arc RPC client logging `NP_ARC_RPC_ERROR` >10× in 60s.
- Payment execution latency >2s.
- Webhook receipts from Arc delayed.

## Triage

1. Test the primary RPC: `curl $ARC_RPC_URL/health`.
2. Check Arc status (TBD; refer to the Arc Discord for now).
3. Check Railway env vars: is the right RPC URL configured for the environment?

## Common causes

- **Public RPC rate-limited.** Switch to a Canteen-hosted Arc testnet RPC (`uv tool install .../ARC-cli`).
- **RPC URL rotated.** Update the env var and redeploy.
- **Network partition between Railway and Arc.** Wait for the partition to clear; failover in the meantime.

## Mitigation

The Payment Engine retries failed Arc transactions with exponential backoff automatically. Manual override:

```bash
# Re-route to a backup RPC (set in env)
export ARC_RPC_URL_BACKUP=https://arc-testnet-rpc-backup.example
pnpm --filter @nanoproof/api payments:retry --all-stuck
```

## Escalation

- Same path as [`api-down.md`](./api-down.md).
- For Arc-side issues, also reach out to Arc team via the Canteen Discord.

## Postmortem

Same template as [`api-down.md`](./api-down.md). Include any txHashes that failed and whether they eventually settled.