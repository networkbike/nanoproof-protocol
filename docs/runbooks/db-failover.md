# Runbook: Database Failover

## Trigger

- Neon connection errors > 5% over 5 minutes.
- API requests timing out at the DB layer.
- Prisma logging `P1001` / `P1017` errors.

## Triage

1. Check Neon status: <https://neonstatus.com>
2. Check Neon metrics: connection count, CPU, replication lag.
3. Identify whether the primary is the failure point or a read replica.

## Common causes

- **Compute suspended** (Neon autoscale to zero on free tier). Wake it via the Neon dashboard.
- **Cold-start latency** on first query after suspension. Re-run a warmup ping.
- **Connection pool exhausted.** Increase the pool size in `apps/api/src/infra/prisma.service.ts`.

## Mitigation

Neon handles failover automatically. The Application does:

- Retry on transient connection errors (already in place via Prisma middleware).
- Use read replicas for analytics workloads to keep primary headroom.

## Escalation

- Same path as [`api-down.md`](./api-down.md).
- For Neon-side issues, contact Neon support via their dashboard.

## Postmortem

Same template. Include any analytics queries that may have stalled.