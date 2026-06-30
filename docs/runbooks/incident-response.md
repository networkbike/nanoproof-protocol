# Runbook: Incident Response

## Trigger

- Any P0/P1 incident (funds at risk, system down, security breach).
- Activation from any on-call engineer or maintainer.

## Severity definitions

| Sev | Definition | Examples |
|-----|------------|----------|
| **P0** | Funds at risk or system fully down | Hot wallet compromise, API 100% error rate |
| **P1** | Major degradation | Payment processing delayed >10 min, dashboard errors |
| **P2** | Minor degradation | Single endpoint flaky, non-critical background job down |
| **P3** | Cosmetic | UI glitch, doc typo, non-functional config |

## Steps

1. **Acknowledge** the page in PagerDuty (TBD; Discord `#incidents` for now).
2. **Open an incident channel** in Discord (`#inc-<date>-<slug>`).
3. **Assign roles:**
   - **Incident Commander** — coordinates the response.
   - **Comms Lead** — updates internal + external stakeholders.
   - **Subject Matter Expert(s)** — actually fix the thing.
4. **Mitigate first, root-cause later.** Stop the bleeding, then dig in.
5. **Update status page** every 15 minutes for P0/P1.
6. **Resolve** when the system is stable.
7. **Schedule postmortem** within 48 hours.

## Communication templates

### Internal (Discord `#inc-...`)

```
[Status] Mitigating.
[Impact] ~30% of payment intents failing with NP_GATEWAY_TIMEOUT.
[Next update] 15 min.
```

### External (status page)

```
[Investigating] We're seeing elevated payment latency. Investigation underway.
```

## Escalation

- **P0:** all hands + Canteen ops via Canteen Discord.
- **P1:** on-call + 1 backup.
- **P2/P3:** on-call.

## Postmortem

Schedule within 48 hours. Use the template in [`api-down.md`](./api-down.md). Publish to [`../../docs/postmortems/`](../../docs/postmortems/) (TBD).