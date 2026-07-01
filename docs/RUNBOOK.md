# NanoProof Protocol — Fly.io Deploy Runbook

> **Single source of truth for deploying NanoProof to Fly.io.**
> All artifacts (Dockerfiles, fly.toml) are already on `main`.
> You just need to run the commands below on a machine with `fly` CLI.

---

## Prerequisites (one time)

### 0.1 Install the fly CLI

On **Linux/macOS** (not Termux from Google Play — that has known incompatibilities):
```bash
curl -L https://fly.io/install.sh | sh
export PATH="$HOME/.fly/bin:$PATH"
```

Verify:
```bash
fly --version
# Should print: flyctl.exe version 0.4.x
```

### 0.2 Sign in to Fly

```bash
fly auth login
```

A browser window opens. Sign in with **GitHub** (same account that owns the repo).
The CLI confirms with `successfully logged in as <your-github-username>`.

### 0.3 Verify you have a payment method on file

Fly requires a card for Postgres + IPv4. Free tier doesn't charge.

1. Go to <https://fly.io/dashboard/billing>
2. Add a card (Visa/MC/Amex)
3. The "Payment Required" badge goes away

### 0.4 Clone the repo

```bash
git clone https://github.com/networkbike/nanoproof-protocol.git
cd nanoproof-protocol
```

Pull the latest:
```bash
git pull origin main
```

---

## Deploy

### 1. Create the Postgres database

```bash
fly postgres create --name nanoproof-db --region iad --vm-size shared-cpu-1x --volume-size 1
```

You'll be prompted for a password. **Write it down** — you'll need it in step 3.

### 2. Create the api app and attach the database

```bash
fly apps create nanoproof-api --org personal
fly postgres attach nanoproof-db --app nanoproof-api
```

This sets `DATABASE_URL` on `nanoproof-api` automatically.

### 3. Set CORS_ORIGINS on the api

Wait — we don't have the web URL yet. We'll set this in step 6 after the web is deployed.

For now, set a placeholder:
```bash
fly secrets set --app nanoproof-api CORS_ORIGINS="https://nanoproof-web.fly.dev"
```

### 4. Deploy the api

```bash
fly deploy --config fly.api.toml
```

This:
- Builds the api image from `apps/api/Dockerfile` on Fly's build servers
- Pushes to Fly's registry
- Creates a machine running the image
- Starts the container
- Runs `prisma migrate deploy` (via the Dockerfile's CMD)
- Exposes port 4000 on `https://nanoproof-api.fly.dev`

**Expected output:** `--> v0 finished with status: success`

**Wait ~5-7 minutes for the build to finish.**

Verify the api is up:
```bash
curl https://nanoproof-api.fly.dev/health
```

Expected response:
```json
{"status":"ok","checks":{"process":"ok","database":"ok"},...}
```

### 5. Create the web app and deploy it

```bash
fly apps create nanoproof-web --org personal
fly secrets set --app nanoproof-web NEXT_PUBLIC_API_URL="https://nanoproof-api.fly.dev"
fly deploy --config fly.web.toml
```

This:
- Builds the web image from `apps/web/Dockerfile`
- Pushes to Fly's registry
- Starts Next.js on port 3000
- Exposes on `https://nanoproof-web.fly.dev`

**Wait ~5-7 minutes for the build to finish.**

Verify the web is up:
```bash
curl -I https://nanoproof-web.fly.dev
```

Expected: `HTTP/2 200`

### 6. Update CORS_ORIGINS on the api (now with the real web URL)

```bash
fly secrets set --app nanoproof-api CORS_ORIGINS="https://nanoproof-web.fly.dev"
```

This restarts the api with the correct CORS setting. Wait 30s.

---

## Verify everything works

### Test the API

```bash
curl https://nanoproof-api.fly.dev/health
# Expected: {"status":"ok",...}

curl https://nanoproof-api.fly.dev/v1/healthz
# Expected: same
```

### Test the web

Open in a browser:
- https://nanoproof-web.fly.dev — marketing page
- https://nanoproof-web.fly.dev/dashboard — dashboard
- https://nanoproof-web.fly.dev/research — research demo
- https://nanoproof-web.fly.dev/simulator — simulator

### Test the demo seed (loads data into the dashboard)

```bash
# First, get an API key from the api's database
fly ssh console --app nanoproof-api -C "cd /app/apps/api && node -e \"console.log('check logs')\""

# Easier: just open the dashboard in a browser, click "Load demo dataset"
# in the sidebar. It will load 100 creators / 500 sources / 1000 citations
# / 1000 payments and populate all 5 dashboard pages.
```

---

## Public URLs

After a successful deploy:

| Service | URL |
|---|---|
| **Web (dashboard + research + simulator)** | `https://nanoproof-web.fly.dev` |
| **API (REST)** | `https://nanoproof-api.fly.dev` |
| **API health** | `https://nanoproof-api.fly.dev/health` |
| **API Swagger docs** | `https://nanoproof-api.fly.dev/docs` |
| **Dashboard** | `https://nanoproof-web.fly.dev/dashboard` |
| **Research demo** | `https://nanoproof-web.fly.dev/research` |
| **Simulator** | `https://nanoproof-web.fly.dev/simulator` |

---

## Useful commands

### Watch logs in real time

```bash
fly logs --app nanoproof-api
fly logs --app nanoproof-web
```

### SSH into a container

```bash
fly ssh console --app nanoproof-api
fly ssh console --app nanoproof-web
```

### Manually run migrations

```bash
fly ssh console --app nanoproof-api -C "cd /app/apps/api && npx prisma migrate deploy"
```

### Update an env var

```bash
fly secrets set --app nanoproof-api CORS_ORIGINS="https://example.com"
```

### Roll back to a previous version

```bash
fly releases --app nanoproof-api
fly releases rollback <version-number> --app nanoproof-api
```

### Delete the entire deployment

```bash
fly apps destroy nanoproof-api
fly apps destroy nanoproof-web
fly postgres destroy nanoproof-db
```

---

## Troubleshooting

### Build fails

Check the build logs:
```bash
fly logs --app nanoproof-api
```

Common issues:
- **`pnpm install` fails** — usually a network issue or a missing package
- **Docker build fails** — usually a missing file. Check that `apps/api/Dockerfile` exists at repo root.

### App starts but healthcheck fails

```bash
fly ssh console --app nanoproof-api -C "curl -s http://localhost:4000/health"
```

If the response shows the API is up, the issue is the healthcheck path. Check `fly.toml` has `path = "/health"`.

### App crashes repeatedly

Check `fly logs` for the actual error. Common causes:
- DATABASE_URL is wrong → re-run `fly postgres attach`
- Migration failed → manually run `fly ssh console --app nanoproof-api -C "cd /app/apps/api && npx prisma migrate deploy"`
- Out of memory → bump VM size in fly.toml `memory = "1gb"`

### CORS error in browser console

The api's `CORS_ORIGINS` env var is missing the web URL or is wrong. Fix:
```bash
fly secrets set --app nanoproof-api CORS_ORIGINS="https://nanoproof-web.fly.dev"
```

### Web dashboard is empty

The api is unreachable from the web. Check:
1. `fly secrets list --app nanoproof-web` — confirm `NEXT_PUBLIC_API_URL` is set to `https://nanoproof-api.fly.dev`
2. The api is responding: `curl https://nanoproof-api.fly.dev/health`
3. CORS_ORIGINS on the api includes the web URL

---

## Free-tier limits

- 3 shared-cpu-1x VMs (256MB each by default, we bumped to 512MB)
- 1GB Postgres, expires after 30 days on free plan
- Bandwidth: 100GB/month
- Apps spin down after 5 min idle; first request takes ~5-10s to wake up

For Lepton (4-week deadline), this is enough.

---

## Custom domain (optional)

If you own a domain:

```bash
fly certs add yourdomain.com --app nanoproof-web
fly certs add api.yourdomain.com --app nanoproof-api
```

Fly gives you a CNAME target. Add to your DNS. SSL is automatic.

For Lepton, the `*.fly.dev` URLs are sufficient — judge-friendly and work out of the box.

---

## Quick reference: full deploy in 8 commands

```bash
# Prerequisites (one time)
fly auth login
git clone https://github.com/networkbike/nanoproof-protocol.git && cd nanoproof-protocol

# Deploy
fly postgres create --name nanoproof-db --region iad --volume-size 1
fly apps create nanoproof-api --org personal
fly postgres attach nanoproof-db --app nanoproof-api
fly secrets set --app nanoproof-api CORS_ORIGINS="https://nanoproof-web.fly.dev"
fly deploy --config fly.api.toml
fly apps create nanoproof-web --org personal
fly secrets set --app nanoproof-web NEXT_PUBLIC_API_URL="https://nanoproof-api.fly.dev"
fly deploy --config fly.web.toml

# Verify
curl https://nanoproof-api.fly.dev/health
open https://nanoproof-web.fly.dev/dashboard
```

That's it. ~12-15 minutes total.

---

## Files used by this runbook

- `apps/api/Dockerfile` — api production image
- `apps/web/Dockerfile` — web production image
- `fly.api.toml` — api fly config
- `fly.web.toml` — web fly config
- `docs/DEPLOY_FLY.md` — older more verbose deploy guide (kept for reference)
- `docs/RUNBOOK.md` — this file (canonical, concise)

---

**If any command fails, copy the exact error message and check the Troubleshooting section.**