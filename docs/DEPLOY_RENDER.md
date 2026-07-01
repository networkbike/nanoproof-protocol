# Deploy NanoProof on Render.com — 15 minutes

> **Recommended path** for the Lepton demo (replaces the Railway/Vercel route
> when those CLIs aren't available). One-click via Render Blueprint +
> zero-config Postgres.

## What you need

1. A **Render** account (free, sign-up at <https://render.com>)
2. The GitHub repo: `networkbike/nanoproof-protocol`
3. ~15 minutes

## Deploy steps

### Step 1 — Apply the Blueprint (3 min)

1. Sign in to <https://dashboard.render.com>
2. Click **New** → **Blueprint**
3. Connect `networkbike/nanoproof-protocol`
4. Render auto-detects `render.yaml` at the repo root
5. Click **Apply**
6. Three services appear in your dashboard:
   - `nanoproof-db` (Postgres 16, free, ~30s to provision)
   - `nanoproof-api` (Node 22 Web Service)
   - `nanoproof-web` (Node 22 Web Service)

Wait for `nanoproof-db` to show **Available** before the api will work.

### Step 2 — Confirm api is healthy (5 min)

1. Click `nanoproof-api` → Logs
2. Watch for: `🚀 NanoProof API ready at http://localhost:4000`
3. Once the build+start logs finish, click the URL at the top of the
   page (something like `nanoproof-api.onrender.com`)
4. Test:
   ```
   curl https://nanoproof-api.onrender.com/health
   ```
   expect: `{"status":"ok","checks":{"process":"ok","database":"ok"},...}`

If you see `degraded` or `connection refused`, wait 30s — Render's
free Postgres has a cold start.

### Step 3 — Confirm web is healthy (3 min)

1. Click `nanoproof-web` → Logs
2. Watch for: `▲ Next.js 15.5.x` then `Ready in ...`
3. Click the URL (`nanoproof-web.onrender.com`)
4. The marketing page should render

If you see a blank page or "Couldn't connect to API", set the env vars
in step 4.

### Step 4 — Wire the cross-service env vars (2 min)

In the **Render Dashboard**:

`nanoproof-api` → Environment:
- `NEXT_PUBLIC_API_URL` is irrelevant on the api (it's a web-side var)
- The api auto-receives `DATABASE_URL` from `nanoproof-db`
- Set `CORS_ORIGINS=https://nanoproof-web.onrender.com` (single value
  for now; add custom domains later)

`nanoproof-web` → Environment:
- `NEXT_PUBLIC_API_URL=https://nanoproof-api.onrender.com`
- `NEXT_PUBLIC_DEMO_MODE=true` (already in render.yaml)
- `NEXT_TELEMETRY_DISABLED=1` (already in render.yaml)

After editing, both services restart automatically. Watch the logs.

### Step 5 — Smoke test (2 min)

```bash
# API health
curl https://nanoproof-api.onrender.com/health
# {"status":"ok","checks":{...}}

# Web loads
open https://nanoproof-web.onrender.com

# Dashboard works
open https://nanoproof-web.onrender.com/dashboard
# should see the "Load Demo Dataset" card in the sidebar
```

Click **"Load demo dataset"** in the sidebar. Wait ~3 seconds.

You should see:
- KPI strip: `100 Creators`, `500 Sources`, `1000 Citations`, `1000 Payments`
- "✅ 100c / 500s / 1000cit / 1000pay" toast in the sidebar
- All 5 dashboard pages populate

### Step 6 — Custom domain (optional, +5 min)

If you own `nanoproof.xyz` (or any other domain):

1. `nanoproof-web` → Settings → Custom Domain → add `nanoproof.xyz`
2. Render gives you a CNAME — add it to your DNS
3. Repeat for `api.nanoproof.xyz`
4. Update CORS_ORIGINS on the api to include `https://nanoproof.xyz`

For Lepton, the `*.onrender.com` URLs are sufficient and faster.

## Public URLs

After deploy, your URLs are:
- **Web:** `https://nanoproof-web.onrender.com`
- **API:** `https://nanoproof-api.onrender.com`
- **API health:** `https://nanoproof-api.onrender.com/health`
- **Dashboard:** `https://nanoproof-web.onrender.com/dashboard`
- **Research demo:** `https://nanoproof-web.onrender.com/research`
- **Simulator:** `https://nanoproof-web.onrender.com/simulate`

## Free-tier caveats (Render)

1. **Spins down after 15 min idle.** First request wakes it back up
   (takes ~10-30 seconds). Mention this to judges.
2. **Postgres expires after 90 days.** Render's free Postgres is
   meant for development. For Lepton (4 weeks), this is fine.
   For production, switch to Neon or Supabase.
3. **No CI.** Render auto-deploys on every push to `main` once
   Blueprint is configured.

## Custom domain — what's required

You do not need a domain for the demo. The `*.onrender.com` URLs are
HTTPS-ready and judge-friendly. Render supports free `*.onrender.com`
subdomains permanently.

If you want a custom domain:
- `nanoproof.xyz` is convenient if you own it
- Render adds free Let's Encrypt certs automatically

## Troubleshooting

**"Cannot connect to database"** — wait 30s for Postgres cold start, hit refresh.

**"CORS error in browser console"** — your `CORS_ORIGINS` is missing the
web URL. Set it on the api service.

**"Demo seed returns 403"** — `NANOPROOF_DEMO_MODE=true` on the api and
`NEXT_PUBLIC_DEMO_MODE=true` on the web. Both required.

**"Web is loading but dashboard is empty"** — the api isn't reachable
from the web. Check `NEXT_PUBLIC_API_URL` is set to `https://nanoproof-api.onrender.com`
(no trailing slash).

**"Build fails at `pnpm install`"** — Render uses Node 22 by default. If
you hit a Node version error, set `RENDER_NODE_VERSION=22` in the api/web env.

## Rollback

In Render Dashboard → service → Deploys → click the previous successful
deploy → "Rollback to this deploy".

Database rollback: Render's free Postgres doesn't support point-in-time
recovery. For Phase 8 / Arc settlement, prefer Neon which does.

## Why this is fast

| What | Railway/Vercel path | Render path |
|---|---|---|
| Make account                 | 2 services × 2 accounts | 1 account   |
| Configure env vars           | 2 × ~10 each = 20 set   | 3 in render.yaml |
| Add DB                       | separate Neon step      | one-click   |
| Connect GitHub                | twice                    | once        |
| Total steps                   | ~25 commands             | 1 click     |

Once Blueprint is applied, every push to `main` redeploys both services
in parallel. ~5-7 minutes end-to-end.