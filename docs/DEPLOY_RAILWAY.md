# Deploy NanoProof to Railway (fresh, from scratch)

> **Why Railway?** Native Postgres, $5 trial credit, auto-detects monorepos, free
> public domains, no corepack/runner.sh issues. Reliable for a Node 22 + pnpm +
> Prisma stack.

This guide assumes Fly.io deploy is being abandoned and you're starting fresh.

---

## Prerequisites

- GitHub account (the repo is already at https://github.com/networkbike/nanoproof-protocol)
- Railway account — sign up at https://railway.app with GitHub (gives $5 trial credit, no card needed)
- 15 minutes of focused time

---

## Step 1 — Create the Railway project

1. Go to https://railway.app/dashboard
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select `networkbike/nanoproof-protocol`
4. Railway will scan the repo and see the monorepo. Click **"Configure"** on the project.

---

## Step 2 — Add PostgreSQL

1. In the project canvas, click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Wait ~30s for it to provision
3. Click on the Postgres service → **"Variables"** tab
4. Note the value of `DATABASE_URL` (click the eye icon to reveal)
5. **Copy the value of `DATABASE_URL`** — you'll paste it into both the api and web services

---

## Step 3 — Deploy the API service

1. In the project canvas, click **"+ New"** → **"GitHub Repo"** → pick `networkbike/nanoproof-protocol` again
2. Click on the new service → **"Settings"** tab
3. Under **"Service Name"**, rename to `nanoproof-api`
4. Under **"Build"**:
   - **Builder**: `Dockerfile`
   - **Dockerfile Path**: `apps/api/Dockerfile`
   - **Watch Paths**: `apps/api/**`, `packages/**`
5. Under **"Deploy"**:
   - **Custom Start Command**: leave empty (the Dockerfile CMD runs migrations + starts api)
   - **Healthcheck Path**: `/health`
   - **Healthcheck Timeout**: `90`
6. Under **"Variables"**, add these:

   ```
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=<paste from step 2>
   CORS_ORIGINS=https://nanoproof-web.up.railway.app
   NANOPROOF_DEMO_MODE=true
   ```

7. Click **"Deploy"**. First build takes ~5-8 minutes (pnpm install + nest build + prisma generate).

---

## Step 4 — Wait for the API to be healthy

1. Click on `nanoproof-api` → **"Deployments"** tab
2. Watch the build logs. Look for:
   - `Successfully built` (Docker build done)
   - `prisma migrate ... applied` (migrations succeeded)
   - `Application listening on port 4000` (NestJS started)
3. Once deployed, click **"Settings"** → **"Networking"** → **"Generate Domain"**
4. Copy the URL (e.g. `https://nanoproof-api.up.railway.app`)
5. Test in browser: open the URL + `/health` → should show `{"status":"ok"}`

---

## Step 5 — Deploy the Web service

1. In the project canvas, click **"+ New"** → **"GitHub Repo"** → pick `networkbike/nanoproof-protocol`
2. Click the new service → **"Settings"** tab
3. Rename to `nanoproof-web`
4. Under **"Build"**:
   - **Builder**: `Dockerfile`
   - **Dockerfile Path**: `apps/web/Dockerfile`
   - **Watch Paths**: `apps/web/**`, `packages/**`
5. Under **"Variables"**:
   ```
   NODE_ENV=production
   PORT=3000
   NEXT_PUBLIC_API_URL=https://nanoproof-api.up.railway.app
   NEXT_TELEMETRY_DISABLED=1
   ```
   (Replace the api URL with the actual one from Step 4)
6. Click **"Deploy"**
7. Once deployed, **"Settings"** → **"Networking"** → **"Generate Domain"**
8. Copy the URL (e.g. `https://nanoproof-web.up.railway.app`)

---

## Step 6 — Wire up CORS

1. Go back to `nanoproof-api` → **"Variables"**
2. Update `CORS_ORIGINS` to the **actual** web URL from Step 5:
   ```
   CORS_ORIGINS=https://nanoproof-web.up.railway.app
   ```
3. Railway will auto-redeploy the api.

---

## Step 7 — Test the full stack

1. Open `https://nanoproof-web.up.railway.app` in your browser
2. You should see the dashboard
3. Click around — dashboard, research, simulator pages should all load

If a page shows "Failed to fetch", check:
- CORS_ORIGINS matches the web URL exactly (no trailing slash, https not http)
- DATABASE_URL is set on the api service
- Both services show "Healthy" in the Railway dashboard

---

## Step 8 (optional) — Seed demo data

If the dashboard shows empty data:

1. Railway → `nanoproof-api` → **"Shell"** tab (or open a one-off terminal)
2. Run: `pnpm db:seed` from `/app/apps/api`
3. Wait ~10s
4. Refresh the web dashboard

---

## Costs

- $5 trial credit covers ~5-7 days of full-stack usage
- After trial: $5/mo flat for hobby plan + pay-as-you-go for resources
- Postgres: ~$1-2/mo for the smallest instance
- Two web services: ~$1-2/mo each on the smallest plan

For the Lepton demo, the $5 trial should be enough.

---

## If something fails

| Symptom | Fix |
|---|---|
| Build fails: "corepack signature" | Use the Dockerfile, not Nixpacks |
| API deploys but healthcheck fails | Check logs for migration errors; verify DATABASE_URL is set |
| Web shows blank page | Check browser console; verify NEXT_PUBLIC_API_URL matches the api domain |
| CORS error in browser | Make sure CORS_ORIGINS on api matches web URL exactly |
| `prisma migrate` fails | Open api service shell, run `pnpm db:reset --force` to wipe and re-apply |

---

## Tear-down (when done with demo)

1. Railway dashboard → project → **"Settings"** → **"Danger Zone"** → **"Delete Project"**
2. Done. No leftover resources.
