# Public Deployment Plan — NanoProof Protocol

> Phase 7B · Render.com path (after Railway/Neon auth friction)
> Target: Lepton demo readiness by submission deadline (Jul 6, 2026)

## Why we switched (from the original Railway/Vercel/Neon plan)

The Phase 7 deploy initially targeted Railway (api) + Vercel (web) +
Neon (Postgres). Three reasons forced a pivot:

1. **PAT friction.** The sandbox CI couldn't push commit `40cbfc7` (the
   CI workflow) because the user's GitHub PAT lacked the `workflow`
   scope. Even after generating a new PAT, `git push` over the
   sandbox's egress was rejected for Git ops specifically. Real fix:
   run deploys from the user's own machine, not the cloud sandbox.

2. **CLI setup cost.** Three CLIs (Railway, Vercel, Neon) each
   required a fresh login + token hand-off. For a hackathon, that's
   ~15 minutes of setup before the first deploy command runs.

3. **The demo doesn't need this much infra.** Lepton judges visit a
   URL, click around for 5 minutes, and form an impression. We don't
   need enterprise scale — we need **one URL that's up during the
   judging window**.

## The new target: Render Blueprint

**Render.com** is a Heroku-style platform with:

- Native Node support (no Dockerfile required)
- Free Postgres tier
- **Blueprints** (render.yaml) — describe infra as code, apply with one click
- Auto-deploy on every push to main
- `*.onrender.com` HTTPS-ready subdomains (no DNS needed)

**One Blueprint deploys the entire stack:** Postgres + api + web.

## Public URLs (post-deploy)

- **Web (dashboard + research + simulator):** `https://nanoproof-web.onrender.com`
- **API (REST + Swagger UI at /docs):** `https://nanoproof-api.onrender.com`
- **Dashboard:** `https://nanoproof-web.onrender.com/dashboard`
- **Demo seed trigger:** POST
  `https://nanoproof-api.onrender.com/v1/analytics/demo/seed`
- **Health check:** `https://nanoproof-api.onrender.com/health`

## Resource costs (Render free tier)

| Resource         | Free tier          | NanoProof usage          |
| ---------------- | ------------------ | ------------------------ |
| Web services     | 750 hrs/mo × N     | 2 services = ~1500 hrs  |
| Postgres         | 256 MB RAM, 1 GB   | plenty for 1000 rows    |
| Bandwidth        | 100 GB/mo          | trivial                  |
| Build minutes    | 500 min/mo         | ~10 min × 4/wk = 160 min |

We can run the full demo at zero cost. The 90-day Postgres expiry
starts at first deploy; for the Lepton 4-week window, this is non-issue.

## Deploy steps (high level)

1. Sign in to Render (1 min)
2. Click **New → Blueprint** → point at `render.yaml` (1 min)
3. Render spins Postgres, then api + web (5-7 min)
4. Set `NEXT_PUBLIC_API_URL` on web + `CORS_ORIGINS` on api (1 min)
5. Test smoke (3 min)
6. Optional: custom domain `nanoproof.xyz` (5 min)

Total: ~15 minutes.

Detailed runbook: see `docs/DEPLOY_RENDER.md`.

## Architecturally what changed vs Phase 7A

| Path                | Phase 7A (Railway/Vercel/Neon) | Phase 7B (Render) |
| ------------------- | ----------------------------- | ------------------- |
| services managed by | 3 separate dashboards         | 1 Blueprint       |
| Custom domains      | manual DNS                    | optional, *.onrender.com by default |
| SSL certs           | per-service                    | auto via Let's Encrypt |
| Health check path   | /health                        | /health (same)    |
| Env var injection   | per-dashboard                  | per-dashboard + auto from Blueprint |
| Postgres scale      | Neon Pro/Scale plan            | Render Postgres 256MB |
| Auto-deploy         | GitHub Actions needed          | Render built-in (with workflow PAT) |
| Cold start          | ~2s (always warm)            | 10-30s on free tier (spins down after 15min idle) |
| Cost                | free for 30 days, then monthly | permanent free    |

## Risk register

| Risk | Severity | Mitigation |
| ---- | -------- | ---------- |
| Render free Postgres sleeps after 15 min idle | medium | Tell judges ~30s warm-up expected |
| Render free Postgres expires after 90 days | low | Within Lepton 4-week window |
| Auto-deploy on every push could deploy broken code | low | Lock to specific commit, or disable auto-deploy post-launch |
| CORS misconfig between api + web | medium | Documented in DEPLOY_RENDER.md step 4 |
| Demo seed requires ADMIN scope on api | low | `NANOPROOF_DEMO_MODE=true` already configured |
| Cold start first API call from web | medium | 30s+ wait, then refresh |

## Public deployment plan (the deliverable)

1. User signs in to Render (GitHub OAuth — no new password).
2. User pastes one URL: `https://github.com/networkbike/nanoproof-protocol/tree/main`
3. Render auto-creates: Postgres + api + web.
4. User waits 5-7 min, pings `/health`.
5. User sets `NEXT_PUBLIC_API_URL` and `CORS_ORIGINS` (one click each).
6. User opens the dashboard, clicks "Load Demo Dataset".
7. Public URLs are live.

## Post-deploy (what happens next)

Phase 8 — **Arc Settlement Proof + ArcScan Verification**:

- Real USDC settlement on Arc testnet for the demo dataset
- ArcScan URL stored in each Payment row
- Dashboard already shows these via the "View tx" link
- A "verify settlement" hash chain endpoint to prove immutability

Phase 9 — **Production hardening**:

- Switch Render Postgres → Neon for 90+ day retention
- Add Sentry for error tracking
- Add PostHog for product analytics
- Tighten CORS to known production origins only
- Add a `/metrics` endpoint (Prometheus) for Render's built-in monitoring

## Why this is the right plan for Lepton

- **Speed to live URL: 15 min** — fast enough to give ourselves buffer
- **No per-demo setup** — judges visit a URL, click around, done
- **Public defaults** — `*.onrender.com` is judge-friendly and accessible
- **Cold-start isn't a problem** — the dashboard `Load Demo Dataset` flow
  is forgiving of 30s wake-up times

If Render doesn't work for some reason, **fallback plan**:

- **Fly.io** — Docker-based, ~30 min to set up vs Render's 15
- **Local-only demo bundle** — `pnpm dev` + SSH tunnel into the phone,
  judges visit a `ngrok.io` URL

Both are documented in `docs/launch-checklist.md` as fallbacks.

## One-line deploy summary

> Render Blueprint at `networkbike/nanoproof-protocol`. One click.
> Three services. Free tier. Public URLs. Auto-deploy on every push
> to main. Up in ~15 minutes.