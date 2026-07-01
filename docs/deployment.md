# NanoProof — Deployment Plan (Lepton Demo)

> Vercel (web) + Railway (api) + Neon (Postgres). Free-tier friendly.
> Total monthly cost for a small demo: $0.

## Architecture

```
                         ┌─────────────────────┐
   Vercel (web)  ───────► │  apps/web           │  Next.js 15
   - /research            │  /api/agent proxy   │
   - /dashboard           └──────────┬──────────┘
   - /simulate                       │ HTTPS
                                     ▼
                         ┌─────────────────────┐
   Railway (api) ───────► │  apps/api           │  NestJS 11
   - /v1/creators         │  Docker container   │
   - /v1/sources          │  port 4000          │
   - /v1/citations/detect └──────────┬──────────┘
   - /v1/payments/settle             │ TLS
                                     ▼
                         ┌─────────────────────┐
   Neon (Postgres) ─────►│  Postgres 16        │  Serverless driver
                         │  (free 0.5GB)       │
                         └─────────────────────┘
```

## 1. Neon (database)

1. Sign up at <https://neon.tech> with GitHub.
2. New project → name `nanoproof-demo` → Postgres 16 → region `aws-us-east-1`.
3. Copy the **pooled connection string** (the one with `-pooler` in the host).
4. Run the migration against it from your local terminal:
   ```bash
   DATABASE_URL='postgresql://...neon.tech/nanoproof?sslmode=require' \
     pnpm --filter @nanoproof/api db:migrate:deploy
   DATABASE_URL='postgresql://...neon.tech/nanoproof?sslmode=require' \
     pnpm --filter @nanoproof/api db:seed
   DATABASE_URL='postgresql://...neon.tech/nanoproof?sslmode=require' \
     pnpm --filter @nanoproof/agent seed
   ```

## 2. Railway (api)

1. Sign up at <https://railway.app> with GitHub.
2. New Project → Deploy from GitHub repo → pick `networkbike/nanoproof-protocol`.
3. Settings:
   - **Root Directory:** `apps/api`
   - **Dockerfile Path:** `apps/api/Dockerfile` (create if missing — see below)
   - **Healthcheck Path:** `/v1/healthz`
4. Variables (Settings → Variables):
   ```
   NODE_ENV=production
   PORT=4000
   LOG_LEVEL=info
   CORS_ORIGINS=https://nanoproof-demo.vercel.app
   DATABASE_URL=<paste Neon pooled URL>
   ARC_RPC_URL=https://rpc.testnet.arc.network
   USDC_ARC_TESTNET=<testnet USDC contract>
   INTERNAL_API_KEY=<mint via /v1/api-keys on first deploy>
   ```
5. Custom domain (optional): `api.nanoproof.xyz` → CNAME to Railway.
6. Click Deploy. Verify with `curl https://<railway-url>/v1/healthz`.

### Dockerfile (api)

Create `apps/api/Dockerfile`:

```Dockerfile
FROM node:22-alpine AS deps
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/agent/package.json ./packages/agent/
RUN corepack enable && pnpm install --frozen-lockfile --prod=false

FROM node:22-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
RUN corepack enable \
    && pnpm --filter @nanoproof/shared build \
    && pnpm --filter @nanoproof/api db:generate \
    && pnpm --filter @nanoproof/api build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
EXPOSE 4000
CMD ["node", "dist/main.js"]
```

## 3. Vercel (web)

1. Sign up at <https://vercel.com> with GitHub.
2. New Project → Import `networkbike/nanoproof-protocol`.
3. Settings:
   - **Root Directory:** `apps/web`
   - **Framework Preset:** Next.js (auto)
   - **Build Command:** `pnpm --filter @nanoproof/agent build && pnpm --filter @nanoproof/shared build && next build`
4. Variables (Settings → Environment Variables):
   ```
   NEXT_PUBLIC_API_URL=https://<railway-url>
   INTERNAL_API_URL=https://<railway-url>
   INTERNAL_API_KEY=<same as Railway>
   ```
5. Deploy. Vercel auto-detects Next.js. The `/research` page should load
   against the Railway API in under 2 seconds.

## 4. Smoke test

```bash
# 1. Healthcheck
curl https://<railway-url>/v1/healthz
# → { "status": "ok", "checks": { "database": "ok" } }

# 2. Open https://<vercel-url>/research, type a question, hit Ask.
# 3. Verify payment rows in Neon: `pnpm --filter @nanoproof/api db:studio`.
# 4. Open the Payment Proof panel and confirm the responseId matches a
#    Payment row in the DB.
```

## 5. Custom domains (optional)

| Subdomain       | Provider | Record                                |
|-----------------|----------|---------------------------------------|
| `nanoproof.xyz` | Cloudflare | Apex → Vercel nameservers           |
| `app.nanoproof.xyz` | Cloudflare | CNAME → Vercel                    |
| `api.nanoproof.xyz` | Cloudflare | CNAME → Railway                  |

## 6. Environment variables (complete)

| Variable                | Where     | Purpose                                  |
|-------------------------|-----------|------------------------------------------|
| `DATABASE_URL`          | api       | Neon pooled Postgres connection          |
| `PORT`                  | api       | `4000`                                   |
| `NODE_ENV`              | api, web  | `production`                             |
| `CORS_ORIGINS`          | api       | Vercel URL (comma-separated)             |
| `LOG_LEVEL`             | api       | `info` (or `debug` for development)      |
| `ARC_RPC_URL`           | api       | `https://rpc.testnet.arc.network`        |
| `USDC_ARC_TESTNET`      | api       | Arc testnet USDC contract address        |
| `INTERNAL_API_KEY`      | api, web  | Service-to-service bearer token          |
| `NEXT_PUBLIC_API_URL`   | web       | Public API URL (Vercel → Railway)        |
| `INTERNAL_API_URL`      | web       | Same; private to Next.js server runtime  |

## 7. Post-deploy checklist

- [ ] `curl https://<api>/v1/healthz` → 200
- [ ] `https://<web>/research` loads, asks a question, returns 7 panels
- [ ] At least 3 Payment rows in the `payments` table
- [ ] All 5 Sources visible in `sources` table with `status = 'ACTIVE'`
- [ ] All 5 Creators visible in `creators` table
- [ ] Swagger at `https://<api>/docs` renders
- [ ] `pnpm --filter @nanoproof/api test:e2e` passes against the Neon DB
- [ ] Demo video recorded (see `docs/demo-script.md`)

## 8. Cost summary

| Service | Tier    | Monthly cost |
|---------|---------|--------------|
| Neon    | Free    | $0 (0.5 GB)  |
| Railway | Free    | $0 (500 hrs) |
| Vercel  | Hobby   | $0            |
| Arc     | Testnet | $0            |
| Circle  | Testnet | $0            |
| **Total** |       | **$0**        |

A Vercel + Railway + Neon demo can be operated indefinitely on the
free tier, provided the demo traffic stays under ~100 visits/day and
the database stays under 0.5 GB. After Lepton, we upgrade Neon to the
Launch tier ($19/mo) for production.
