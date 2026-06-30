# Operational Runbooks

> Step-by-step procedures for operating NanoProof in production.

---

## Runbooks

| Scenario | Runbook |
|----------|---------|
| API down | [`api-down.md`](./api-down.md) |
| Payment processor stuck | [`payments-stuck.md`](./payments-stuck.md) |
| Arc RPC failure | [`arc-rpc-failure.md`](./arc-rpc-failure.md) |
| Database failover | [`db-failover.md`](./db-failover.md) |
| Secrets rotation | [`secrets-rotation.md`](./secrets-rotation.md) |
| Incident response | [`incident-response.md`](./incident-response.md) |

---

## Conventions

- Every runbook has a **Trigger** section describing when to use it.
- Every runbook has a **Triage** section with the first 5 minutes of checks.
- Every runbook has an **Escalation** path with named contacts.
- Every runbook ends with a **Postmortem** checklist.

---

## On-call

TBD during Phase 9 (Public Beta). Until then, contact [ops@nanoproof.xyz](mailto:ops@nanoproof.xyz) for any production issue.