# Launch Checklist — NanoProof Protocol

> Audience: the team doing the actual deploy.
> Date: 2026-07-01 (Phase 7)

## Pre-flight (T-30 min)

- [ ] All 63 tests green locally: `pnpm -r --filter '!@nanoproof/contracts' test && pnpm --filter @nanoproof/api test:e2e`
- [ ] Production builds clean: `pnpm --filter @nanoproof/web build && pnpm --filter @nanoproof/api build`
- [ ] Repo is at `c629708` or later: `git log --oneline | head -5`
- [ ] Neon Postgres project provisioned, connection string copied
- [ ] Vercel account has the `networkbike/nanoproof-protocol` repo connected
- [ ] Railway account linked to the same repo
- [ ] Custom domain (`nanoproof.xyz`) DNS ready

## Step 1 — Provision Neon Postgres

1. Sign in to <https://console.neon.tech>
2. Create a new project: `nanoproof-prod`
3. Region: `us-east-1` (matches Vercel default)
4. Postgres 16
5. Copy the **pooled connection string** (the one with `-pooler` in the host)
6. Save as `DATABASE_URL` for Railway later

## Step 2 — Deploy the API to Railway

1. Sign in to <https://railway.com/dashboard>
2. **New Project → Deploy from GitHub repo** → `networkbike/nanoproof-protocol`
3. Root directory: `apps/api`
4. Railway auto-detects `railway.toml`
5. **Variables** tab — set:
   ```
   NODE_ENV=production
   PORT=$PORT                              # auto-injected by Railway
   LOG_LEVEL=info
   CORS_ORIGINS=https://nanoproof.xyz,https://www.nanoproof.xyz
   DATABASE_URL=postgresql://USER:PASS@ep-xxx.region.aws.neon.tech/nanoproof?sslmode=require
   DATABASE_POOL_SIZE=10
   DATABASE_POOL_TIMEOUT_MS=5000
   NANOPROOF_DEMO_MODE=true
   PAYMENTS_ENABLED=true
   CITATION_ENGINE_ENABLED=true
   RATE_LIMIT_PER_MINUTE=600
   ARC_RPC_URL=https://testnet-rpc.arc.io
   ARC_CHAIN_ID=arc-testnet
   ARCSCAN_URL=https://testnet.arcscan.app
   ```
6. **Settings → Health Check**:
   - Path: `/health`
   - Timeout: 30s
7. Deploy. Wait for "Build successful" + "Active".
8. **Verify**:
   ```bash
   curl https://<your-railway-app>.up.railway.app/health
   # expect: {"status":"ok","checks":{"process":"ok","database":"ok"}, ...}
   ```
9. **Run migrations** (one-off, from a shell on Railway or via the CLI):
   ```bash
   railway run "pnpm exec prisma migrate deploy"
   ```
10. **Mint a demo API key** for the dashboard (admin scope):
    - Hit `POST /v1/creators` to create a creator, or just record an existing one
    - Hit `POST /v1/apikeys` with `scopes: [ADMIN]` to mint an admin key
    - Save the plaintext `np_live_<prefix>.<secret>` token for the dashboard
11. **Custom domain**: settings → networking → add `api.nanoproof.xyz`

## Step 3 — Deploy the Frontend to Vercel

1. Sign in to <https://vercel.com/dashboard>
2. **Add New → Project** → import `networkbike/nanoproof-protocol`
3. Root directory: `apps/web`
4. Framework: Next.js (auto-detected)
5. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://api.nanoproof.xyz
   NEXT_PUBLIC_DEMO_MODE=true
   NEXT_TELEMETRY_DISABLED=1
   ```
6. Deploy.
7. **Verify**:
   - <https://nanoproof.xyz> → 200, marketing page
   - <https://nanoproof.xyz/dashboard> → 200, dashboard with seed data
   - <https://nanoproof.xyz/research> → 200, research demo page
   - <https://nanoproof.xyz/simulate> → 200, simulator
8. **Custom domain**: settings → domains → add `nanoproof.xyz` and `www.nanoproof.xyz`

## Step 4 — Seed the demo dataset (one-click)

1. Open <https://nanoproof.xyz/dashboard>
2. Click "Load Demo Dataset" in the sidebar
3. Wait ~3 seconds
4. Verify: KPI strip shows `100 Creators`, `500 Sources`, `1000 Citations`, `1000 Payments`, `~$5.00 USDC settled`
5. Verify: navigate to `/dashboard/creators` and see the top-10 podium
6. Verify: navigate to `/dashboard/citations` and run a search for "transformer"

## Step 5 — Smoke test (T-5 min before demo)

- [ ] `/health` returns 200 with `{status:"ok"}` on the api
- [ ] `/liveness` returns 200 on the api
- [ ] `/readiness` returns 200 on the api
- [ ] Frontend `/` loads in <2s
- [ ] Frontend `/dashboard` loads with seeded data
- [ ] Frontend `/research` shows the agent demo
- [ ] Frontend `/simulate` accepts a creatorId and returns a payment

## Step 6 — Post-launch

- [ ] Monitor Railway logs for errors (Sentry or axiom if configured)
- [ ] Monitor Vercel logs (built-in dashboard)
- [ ] Neon: enable "Always on" so the compute doesn't sleep
- [ ] Set up uptime monitoring (UptimeRobot / Better Uptime) on `https://api.nanoproof.xyz/health`
- [ ] Capture a screenshot of each dashboard page for the README

## Rollback plan

| Step | If broken       | Rollback                                     |
| ---- | --------------- | -------------------------------------------- |
| 4    | Frontend broken | Vercel → Deployments → promote previous       |
| 4    | API broken      | Railway → Deployments → rollback             |
| 4    | DB broken       | Neon → branch restore to last-good timestamp |

All migrations are append-only. A bad migration is fixed by writing a
forward-only follow-up.

## Public URLs (after launch)

- **Frontend:** <https://nanoproof.xyz>
- **API:** <https://api.nanoproof.xyz>
- **API docs (Swagger UI):** <https://api.nanoproof.xyz/docs>
- **Dashboard:** <https://nanoproof.xyz/dashboard>
- **Research demo:** <https://nanoproof.xyz/research>
- **Simulator:** <https://nanoproof.xyz/simulate>

## Judge-facing flow

```
Judge opens → https://nanoproof.xyz
  → clicks "Dashboard" in the nav
  → sees 100/500/1000/1000 KPI strip (or clicks "Load Demo Dataset")
  → navigates to /dashboard/creator/<id> for a deep view
  → opens /dashboard/payments to see settled transactions
  → opens a transaction on ArcScan via the "View" link
  → concludes: this is real, this is auditable, this works.
```

Total time-to-impression: **under 3 minutes.**