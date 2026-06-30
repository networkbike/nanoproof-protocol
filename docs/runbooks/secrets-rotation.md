# Runbook: Secrets Rotation

## Trigger

- Scheduled (quarterly) rotation of API keys and tokens.
- After a confirmed leak or suspected exposure.
- After a team member with access leaves the project.

## What to rotate

| Secret | Where it lives | Rotation cadence |
|--------|----------------|------------------|
| `CLERK_SECRET_KEY` | Railway env | Quarterly |
| `CIRCLE_API_KEY` | Railway env | Quarterly |
| `AGENT_WALLET_PRIVATE_KEY` | Railway env | **Immediately on suspected exposure** |
| `SENTRY_DSN` | Vercel + Railway env | Annually |
| `AXIOM_TOKEN` | Vercel + Railway env | Annually |
| GitHub deploy keys | Repo settings | Quarterly |

## Procedure

1. **Generate the new secret** in the upstream system.
2. **Add the new secret** to the target environment (Railway / Vercel / Neon).
3. **Deploy** so the new value is picked up.
4. **Verify** by hitting a health check that exercises the secret.
5. **Revoke the old secret** upstream.
6. **Update the secret inventory** in `docs/postmortems/secrets-inventory.md`.

## Special case: `AGENT_WALLET_PRIVATE_KEY`

The agent hot wallet signs payouts. On suspected exposure:

1. **Move all USDC** from the compromised wallet to a new wallet via an emergency transfer.
2. **Generate a new wallet** (`arc wallet new`).
3. **Update `AGENT_WALLET_PRIVATE_KEY`** in Railway.
4. **Re-deploy** the API to pick up the new key.
5. **Investigate** how the exposure happened.
6. **Publish** a postmortem.

## Escalation

- Same path as [`api-down.md`](./api-down.md).
- For wallet compromise, treat as a **critical-severity incident**.

## Postmortem

Same template. Include the cause of exposure and the controls added to prevent recurrence.