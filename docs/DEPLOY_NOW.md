# Deploy NanoProof in 15 minutes

You need:
- A Vercel account (https://vercel.com)
- A Railway account (https://railway.com)
- A Neon account (https://neon.tech)
- Optional: a domain you control (nanoproof.xyz assumed below)

## 1. Neon Postgres (3 min)

1. Sign in to console.neon.tech
2. Create project `nanoproof-prod`, region `us-east-1`, Postgres 16
3. Copy the **pooled** connection string (host ends in `-pooler`)
4. Save it — you'll paste it into Railway

## 2. Railway (api) (5 min)

```bash
# From the repo root, with the Railway CLI installed:
railway login
railway init   # create a new project linked to networkbike/nanoproof-protocol
cd apps/api
railway variables set NODE_ENV=production
railway variables set PORT=$PORT
railway variables set LOG_LEVEL=info
railway variables set CORS_ORIGINS=https://nanoproof.xyz,https://www.nanoproof.xyz
railway variables set DATABASE_URL="<paste neon pooled connection string here>"
railway variables set DATABASE_POOL_SIZE=10
railway variables set NANOPROOF_DEMO_MODE=true
railway variables set PAYMENTS_ENABLED=true
railway variables set CITATION_ENGINE_ENABLED=true
railway variables set ARC_RPC_URL=https://rpc.testnet.arc.network
railway variables set ARCSCAN_URL=https://testnet.arcscan.app
railway variables set RATE_LIMIT_PER_MINUTE=600
railway up
# Wait for "Active" status
railway domain nanoproof.xyz  # if you want api.nanoproof.xyz specifically, do this in the dashboard

# Run migrations (one-off)
railway run "pnpm exec prisma migrate deploy"
```

## 3. Vercel (web) (5 min)

```bash
# From the repo root, with the Vercel CLI installed:
vercel login
vercel link   # link to your team / project
cd apps/web
vercel env add NEXT_PUBLIC_API_URL production
# paste: https://api.nanoproof.xyz
vercel env add NEXT_PUBLIC_DEMO_MODE production
# paste: true
vercel env add NEXT_TELEMETRY_DISABLED production
# paste: 1
vercel --prod

# Add the domain in the Vercel dashboard:
#   Settings → Domains → nanoproof.xyz
#   Settings → Domains → www.nanoproof.xyz
```

## 4. Verify (2 min)

```bash
# API health
curl https://api.nanoproof.xyz/health
# expect: {"status":"ok","checks":{"process":"ok","database":"ok"}, ...}

# API liveness
curl https://api.nanoproof.xyz/liveness
# expect: {"status":"ok","uptime":N,"timestamp":"..."}

# Web
open https://nanoproof.xyz
open https://nanoproof.xyz/dashboard

# Click "Load Demo Dataset" in the sidebar
# Verify: KPI strip shows 100 creators, 500 sources, 1000 citations, 1000 payments
```

## 5. Smoke tests (5 min)

Visit each dashboard page and confirm it renders:

- `/` — landing page
- `/dashboard` — KPI strip
- `/dashboard/creators` — directory with podium
- `/dashboard/creator/<id>` — pick one, deep view
- `/dashboard/citations` — search for "transformer"
- `/dashboard/payments` — settled payments visible
- `/dashboard/protocol` — macro health
- `/research` — research demo
- `/simulate` — simulator

If anything 500s, check Railway logs:
```bash
railway logs
```

## 6. Tell me it's live

Once `curl https://api.nanoproof.xyz/health` returns ok, drop the URL in
the chat and I'll verify the dashboard end-to-end (with the demo seed
button) and write the post-launch report.
