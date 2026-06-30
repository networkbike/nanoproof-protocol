# Runbook: API Down

## Trigger

- Health check (`/v1/healthz`) returning 5xx or timing out.
- PagerDuty alert from Railway metrics.
- User reports of dashboard failures.

## Triage (first 5 minutes)

1. Check Railway status: <https://railway.app/status>
2. Check Neon status: <https://neonstatus.com>
3. Check the API logs in Axiom: filter by `service:api level:error`.
4. Check recent deployments in Railway — was a new deploy triggered in the last hour?

## Common causes

- **Bad deploy** — roll back via Railway.
- **Database connection pool exhausted** — check Neon metrics; consider scaling compute.
- **Upstream provider (Circle, Arc) outage** — see [`arc-rpc-failure.md`](./arc-rpc-failure.md).
- **Redis (BullMQ) down** — payment orchestration stalls; reads still work.

## Escalation

- **L1:** on-call engineer (TBD)
- **L2:** Canteen maintainer @kdrohan (Discord)
- **L3:** Canteen ops (email)

## Postmortem

Within 48 hours:
- [ ] Root cause documented.
- [ ] Timeline (detect → triage → mitigation → resolution).
- [ ] Customer impact (downtime window, failed payments, lost revenue).
- [ ] Action items to prevent recurrence.
- [ ] Published to [`../../docs/postmortems/`](../../docs/postmortems/).