# Deploy NanoProof on Fly.io — Step-by-Step

> **Why Fly.io over Render:** Render's free tier has fundamental incompatibilities
> with pnpm monorepos on Node 22 (corepack signature rotation + runner.sh
> initialization issues with custom buildCommands). Fly.io gives us real
> containers with full control — no magic, no surprises.

## What you need

- A **Fly.io** account (free, sign up at <https://fly.io> with GitHub OAuth)
- A laptop or Termux with the **fly CLI** installed
- ~30 minutes (mostly waiting for builds)

---

## Part 1 — One-time setup

### 1.1 Install the fly CLI

**On Termux:**
```bash
pkg install curl -y
curl -L https://fly.io/install.sh | sh
export PATH="$HOME/.fly/bin:$PATH"
echo 'export PATH="$HOME/.fly/bin:$PATH"' >> ~/.bashrc
fly version
```

**On macOS:**
```bash
brew install flyctl
```

**On Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

### 1.2 Sign in

```bash
fly auth login
```

A browser window opens. Sign in with GitHub. The CLI receives a token.

### 1.3 Clone the repo (if you haven't already)

```bash
git clone https://github.com/networkbike/nanoproof-protocol.git
cd nanoproof-protocol
```

---

## Part 2 — Create the Postgres database

Fly has a managed Postgres. The free tier gives you 1GB, which is plenty.

```bash
fly postgres create --name nanoproof-db --region iad
```

When prompted, choose **Development** (free, 256MB) and pick a password (or auto-generated).

After creation, **note the connection string** Fly prints — you'll need it for the api.

Attach the database to a Fly app so the API can read it:
```bash
fly postgres attach nanoproof-db --app nanoproof-api
```

This sets the `DATABASE_URL` env var on `nanoproof-api` automatically.

---

## Part 3 — Deploy the API

```bash
fly launch --config fly.api.toml --no-deploy
```

This creates the `nanoproof-api` Fly app using the config in `fly.api.toml`. The `--no-deploy` flag means we don't deploy yet — we want to set secrets first.

**Set the env vars** (those that shouldn't be in git):
```bash
fly secrets set --app nanoproof-api \
  CORS_ORIGINS="https://nanoproof-web.fly.dev" \
  DATABASE_URL="<the postgres connection string from Part 2>"
```

**Deploy:**
```bash
fly deploy --config fly.api.toml
```

This builds the Docker image (using `apps/api/Dockerfile`) and pushes it. First build takes ~5-8 min; subsequent deploys are faster due to caching.

**Watch the logs:**
```bash
fly logs --app nanoproof-api
```

Look for:
- `Build successful` (image built)
- `Deploying...` (container starting)
- `migrate deploy` output (Prisma migrations applied)
- `🚀 NanoProof API ready at http://0.0.0.0:4000` (server up)

**Test:**
```bash
curl https://nanoproof-api.fly.dev/health
# Expect: {"status":"ok","checks":{"process":"ok","database":"ok"}}
```

---

## Part 4 — Deploy the Web

```bash
fly launch --config fly.web.toml --no-deploy
```

**Set the env var pointing to the API:**
```bash
fly secrets set --app nanoproof-web \
  NEXT_PUBLIC_API_URL="https://nanoproof-api.fly.dev"
```

**Deploy:**
```bash
fly deploy --config fly.web.toml
```

Wait ~5-8 min for the build.

**Test:**
```bash
curl -I https://nanoproof-web.fly.dev
# Expect: HTTP/2 200

open https://nanoproof-web.fly.dev
# Expect: marketing page
```

---

## Part 5 — Wire CORS and verify

After the web is up, update the api's `CORS_ORIGINS` to match the actual web URL:
```bash
fly secrets set --app nanoproof-api \
  CORS_ORIGINS="https://nanoproof-web.fly.dev"
```

**Final smoke test:**
```bash
# API health
curl https://nanoproof-api.fly.dev/health

# Web loads
open https://nanoproof-web.fly.dev

# Dashboard works
open https://nanoproof-web.fly.dev/dashboard

# Click "Load demo dataset" in the sidebar
# Expect: "✅ 100c / 500s / 1000cit / 1000pay" toast
```

---

## Public URLs (post-deploy)

| Service | URL |
|---|---|
| **Web (dashboard + research + simulator)** | `https://nanoproof-web.fly.dev` |
| **API (REST + Swagger)** | `https://nanoproof-api.fly.dev` |
| **API health** | `https://nanoproof-api.fly.dev/health` |
| **API docs** | `https://nanoproof-api.fly.dev/docs` |
| **Dashboard** | `https://nanoproof-web.fly.dev/dashboard` |
| **Research demo** | `https://nanoproof-web.fly.dev/research` |
| **Simulator** | `https://nanoproof-web.fly.dev/simulator` |

---

## Free-tier caveats (Fly.io)

1. **Apps spin down after no traffic for 5 min.** First request wakes them (~5-10s).
2. **3 shared VMs (256MB each) included in free tier.** Both services fit comfortably.
3. **Postgres: 1GB free, expires after 30 days on the free plan.** For Lepton (4 weeks), this is fine.
4. **No CI workflow needed** — `fly deploy` from your laptop is the deploy command. We can add GitHub Actions later for auto-deploy on push.

---

## Custom domain

Optional. To use `nanoproof.xyz`:
```bash
fly certs add nanoprof.xyz --app nanoproof-web
fly certs add api.nanoproof.xyz --app nanoproof-api
```

Fly gives you a CNAME target to add to your DNS. SSL is automatic.

For the Lepton demo, the `*.fly.dev` URLs are judge-friendly and work out of the box.

---

## Troubleshooting

**Build fails during `pnpm install`** — check `fly logs --app nanoproof-api` for the actual error. Most likely a network issue or a missing package in package.json.

**Container starts then exits** — check `fly logs`. Most likely DATABASE_URL is wrong or the Postgres attach didn't work.

**Migrations fail** — the api's CMD has `|| echo 'migrate failed; continuing'` so the api still starts. You can manually run migrations:
```bash
fly ssh console --app nanoproof-api
cd /app/apps/api
npx prisma migrate deploy
```

**Health endpoint returns 503** — the api is up but DB connection is broken. Check DATABASE_URL.

**CORS error in browser console** — your `CORS_ORIGINS` on the api is wrong. Update with `fly secrets set`.

---

## Rollback

```bash
fly releases --app nanoproof-api
fly releases rollback <version> --app nanoproof-api
```

Postgres rollback: Fly's free Postgres supports `fly postgres snapshot` for backups.

---

## Why this is fast

| What | Render path | Fly.io path |
|---|---|---|
| Account setup | 1 account | 1 account (GitHub OAuth) |
| CLI | none needed (web UI) | fly CLI on your machine |
| Dockerfile | would need to bypass runtime | full control from day 1 |
| Free tier | 750 hrs/mo + 1GB Postgres | 3 shared VMs + 1GB Postgres |
| Cold start | 10-30s | 5-10s |
| Custom domains | supported | supported |
| Time to live URL | 15 min (in theory) | 30 min (in practice, but reliable) |

The Fly.io path takes longer the first time, but it's the path that actually works.
