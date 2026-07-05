# Running NanoProof on Termux (Android Phone)

**Goal:** Get the full NanoProof Protocol stack running on your Android phone via Termux, so you can screen-record a real walkthrough — not a mocked demo. Includes the database, the API, the web dashboard, AND a working x402 → Arc USDC payment flow.

> Time to first demo: **~15 minutes** on a modern phone (Pixel 7 / Galaxy S22 / equivalent). Slower phones take ~25 minutes for the `pnpm install` step.

---

## Why this is non-obvious

The README's quickstart asks for `docker compose up` (Postgres + Redis). **Docker doesn't run on Termux** — Termux is a userspace container, not a full Linux userland; even proot-distro Ubuntu can't reach `/dev/null` to grant privileged access. So we substitute:

| What the README needs | Termux equivalent |
|---|---|
| Postgres 16 (docker) | **pglite** — Postgres compiled to WASM, runs in-process |
| Redis 7 (docker) | **NOT NEEDED** — we removed redis from the runtime (it's only a rate-limit cache, optional) |
| `prisma migrate deploy` | Already adapted — `prisma migrate deploy` works against pglite via the pg wire-protocol |
| Chrome / Safari (laptop) | **Android Chrome** at `127.0.0.1:3000` |

pglite stands up a real Postgres wire-protocol server on `127.0.0.1:5432`, so Prisma connects to it the same way it would connect to a real Postgres. Your npm code (`@prisma/client`, `@prisma/adapter-pg`, `pg`) doesn't change at all.

---

## Option A — Pure Termux (no proot) — RECOMMENDED

Tested on Termux 0.118 from **F-Droid** (NOT Google Play — Play is stale).

### 0. Install Termux from F-Droid

1. Uninstall any existing Termux (Google Play version is broken).
2. Install from [https://f-droid.org/en/packages/com.termux/](https://f-droid.org/en/packages/com.termux/).
3. Open Termux once and let it finish bootstrapping.
4. **Update everything BEFORE installing anything else:**

```bash
pkg update -y && pkg upgrade -y
termux-setup-storage          # lets Termux see /sdcard (for adb push if needed)
```

### 1. Install build dependencies (~3 min)

```bash
pkg install -y \
  nodejs-lts \
  git \
  python3 \
  make \
  cmake \
  openssl \
  libffi \
  unzip
```

> **Note:** Termux's `nodejs-lts` is 20.x, which matches our `engines.node >= 20.18.2`. We don't need `python` for our deps, but the `pnpm install` step occasionally falls back to native build scripts that want `python3` on `PATH`.

### 2. Install pnpm globally (~1 min)

```bash
npm install -g pnpm@9
pnpm --version   # expect 9.x
```

### 3. Clone the repo (~30s on wifi, ~2 min on cellular)

```bash
cd ~
git clone https://github.com/networkbike/nanoproof-protocol.git
cd nanoproof-protocol
```

If `git clone` is slow: `git clone --depth 1 https://...` for a shallow clone (we don't need 73 commits of history for a demo video).

### 4. Install JS dependencies (~5-15 min)

This is the longest step. **Run it in tmux / `nohup` so you don't lose progress on a screen lock:**

```bash
pnpm install --no-audit --no-fund --prefer-offline
```

If it ever fails with "ENOSPC: System limit for number of file watchers reached":

```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf 2>/dev/null \
  || echo fs.inotify.max_user_watches=524288 >> $PREFIX/etc/sysctl.conf
sysctl -p || true
# Termux alternative: just lower turbo's file watch budget
export TURBO_CONCURRENCY=2
```

### 5. Start the database (pglite) — terminal tab 1

Open a **second Termux session** (swipe from the left edge → "New session", or use the `tmux` shortcut in Termux: `tmux new -s db`):

```bash
cd ~/nanoproof-protocol/apps/api
# Use the project's already-installed binary
./node_modules/.bin/pglite-server --port=5432 --database=nano-local &
# Or, more robust on Termux, give it a writable data dir:
mkdir -p ~/nanoproof-data
./node_modules/.bin/pglite-server --port=5432 --user=root --database=nano-local \
    --data-dir=$HOME/nanoproof-data

# You should see something like:
#   [pglite-socket] listening at 127.0.0.1:5432 (database: nano-local)
```

> If the binary prints "[Function: Function]" or any garbage, your Node version is wrong. Re-check `node --version` (must be v20.x).

### 6. Create the .env files — terminal tab 1 (where you started pglite)

```bash
cd ~/nanoproof-protocol
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Then edit `apps/api/.env`:

```bash
cat > apps/api/.env <<'EOF'
NODE_ENV=development
PORT=4000
LOG_LEVEL=info

# pglite on 127.0.0.1:5432
DATABASE_URL=postgresql://root@127.0.0.1:5432/nano-local
DATABASE_SHADOW_URL=postgresql://root@127.0.0.1:5432/nano-local
DATABASE_POOL_SIZE=5
DATABASE_POOL_TIMEOUT_MS=5000

# Arc testnet
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=arc-testnet
ARCSCAN_URL=https://testnet.arcscan.app

# x402 facilitator — leave unset for dev mode
# X402_FACILITATOR_URL=

# Auth — set to "demo" for OTP-free testing
AUTH_PROVIDER=demo
JWT_SECRET=local-dev-secret-do-not-use-in-production-please-change

# Demo mode (bypasses API key check for x402 endpoints)
NANOPROOF_DEMO_MODE=true
EOF
```

And `apps/web/.env.local`:

```bash
cat > apps/web/.env.local <<'EOF'
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000
NEXT_PUBLIC_DEMO_MODE=true
NEXT_TELEMETRY_DISABLED=1
EOF
```

> The `AUTH_PROVIDER=demo` flag tells the API to skip sending a real email. The OTP will appear in the API logs instead — perfect for screen recording (you can show "OTP sent to user" → "OTP verified" without spamming a real inbox). For real email delivery in a video, set `AUTH_PROVIDER=resend` and `RESEND_API_KEY=re_xxx` instead.

### 7. Initialize the database schema — terminal tab 1

```bash
cd ~/nanoproof-protocol/apps/api
DATABASE_URL=postgresql://root@127.0.0.1:5432/nano-local \
  ./node_modules/.bin/prisma migrate deploy
```

You should see:
```
3 migrations found in prisma/migrations
Applying migrations...
Migration 20260701000001_phase2_creator_registry applied
Migration 20260701100000_phase3_citation_engine_thinslice applied
Migration 20260703000000_phase8_x402_settlement applied
All migrations have been successfully applied.
```

If you see "P1017: server closed the connection", pglite is not running. Go back to step 5.

### 8. (Optional) Seed demo data — terminal tab 1

```bash
cd ~/nanoproof-protocol/apps/api
DATABASE_URL=postgresql://root@127.0.0.1:5432/nano-local \
  ./node_modules/.bin/tsx prisma/seed.ts
```

Then, **for the videos** (creates realistic citations + Arc testnet settlements):

```bash
cd ~/nanoproof-protocol
node scripts/seed-citations.js
# Result: 6 sources, 51 citations, 269 settled payments, $0.97 USDC distributed
```

### 9. Start the API — terminal tab 2 (or background tab 1)

```bash
cd ~/nanoproof-protocol/apps/api
node dist/main.js
# OR for hot-reload while recording:
pnpm dev
```

Wait for:
```
[NestApplication] Nest application successfully started
[Prisma] Prisma connected (pg adapter)
🚀 API listening at http://127.0.0.1:4000
```

Test with `curl`:

```bash
curl http://127.0.0.1:4000/v1/healthz
# {"status":"ok","db":"ok"}

curl http://127.0.0.1:4000/auth/status
# {"configured":true,"provider":"demo","mode":"development"}
```

### 10. Start the web dashboard — terminal tab 3 (or background)

```bash
cd ~/nanoproof-protocol/apps/web
pnpm dev
```

Wait for:
```
▲ Next.js 15.x (local)
  Local: http://127.0.0.1:3000
```

### 11. Open the dashboard on your phone

Open **Chrome** on your phone and go to:

```
http://127.0.0.1:3000
```

You should see the NanoProof landing page.

> **"This site can't be reached"** — Android Chrome treats `127.0.0.1` as the **phone's** loopback in some configs. If you see this, use `http://10.0.2.2:3000` (Android emulator alias) or, on a real device, set up `adb reverse`:
>
> ```bash
> adb reverse tcp:3000 tcp:3000
> adb reverse tcp:4000 tcp:4000
> ```
>
> Then Chrome will reach both ports via `http://127.0.0.1:<port>`.
>
> Alternative (no adb): use Termux:Float or Hacker's Keyboard to keep Termux on screen while Chrome shows above it.

---

## Option B — proot-distro Ubuntu (heavier, more compatible)

Use this if you hit a Node-native-binary issue with Option A. proot-distro gives you a full Debian userland via PRoot (no root needed).

```bash
pkg install -y proot-distro
proot-distro install ubuntu
proot-distro login ubuntu

# now you're in a "Debian on Android" environment — install everything as if you were on Linux
apt update -y && apt install -y nodejs npm git python3 build-essential

# everything else is identical to Option A from step 2 onwards
```

The only gotcha: forward host ports so Chrome on the phone can reach proot's loopback:

```bash
adb reverse tcp:3000 tcp:3000
adb reverse tcp:4000 tcp:4000
```

You can also use a **[port-forwarding Termux plugin](https://wiki.termux.com/wiki/Termux:API)** to set up reverse-proxy via the Termux:API app, no adb required.

---

## Screen recording the demo

Recommended flow for a 60-second judge walkthrough:

1. **Open the wizard route:** `http://127.0.0.1:3000/demo` — animated 10-step auto-runner, finishes in ~8 seconds.
2. **Or do the live flow:**
   - `/` → click "Launch demo"
   - `/payments` → "Start x402 flow" → watch 402 challenge → EIP-3009 signature → Arc testnet settle → ArcScan verify
   - `/history` → click any settlement → show the hash-chained SettlementProof + ArcScan link
3. **Add narration** — toggle off Chrome notifications, set screen brightness low, use a simple voiceover.
4. **Foreground pglite and API logs** so the audience sees the on-chain activity flowing through.

Suggested Termux display setup:

```bash
# Show api + pglite logs side-by-side
tmux new -s demo \; \
  send-keys 'cd ~/nanoproof-protocol/apps/api && node dist/main.js' C-m \; \
  split-window -v \; \
  send-keys 'cd ~/nanoproof-protocol/apps/api && ./node_modules/.bin/pglite-server --port=5432 --database=nano-local --data-dir=$HOME/nanoproof-data' C-m \; \
  attach
```

---

## Troubleshooting

### `pglite-server` binary won't start / "incompatible architecture"

Make sure Node is 20.x, not 21 or 22 (the pg adapter has some incompatibilities with newer Node):

```bash
node --version    # should report v20.x
```

If you have multiple Node versions, force Termux to use the LTS one:

```bash
pkg uninstall nodejs 2>/dev/null
pkg install -y nodejs-lts
```

### `pnpm install` fails with "ELIFECYCLE Command failed"

Likely a native binary build (e.g. `bcrypt`). Drop to safe flags:

```bash
pnpm install --no-audit --no-fund --ignore-scripts --prefer-offline
```

If a tool we need is actually broken without its postinstall hook, retry without `--ignore-scripts`.

### Prisma client not generated

Run it explicitly:

```bash
cd ~/nanoproof-protocol
pnpm --filter @nanoproof/api exec prisma generate
```

### Port 5432 already in use

You may have a leftover Postgres from another app. Check:

```bash
netstat -tlnp 2>/dev/null | grep 5432
```

Kill the old process, or change the port:

```bash
./node_modules/.bin/pglite-server --port=5433 --database=nano-local --data-dir=$HOME/nanoproof-data
# And update DATABASE_URL=postgresql://root@127.0.0.1:5433/nano-local
```

### Chrome can't reach `127.0.0.1`

Two fallbacks:

1. **`adb reverse`:** plug into a computer, run `adb reverse tcp:3000 tcp:3000; adb reverse tcp:4000 tcp:4000`.
2. **Same-network browser:** if your phone and a laptop are on the same wifi, find the phone's IP from Termux with `ifconfig wlan0` (install with `pkg install iproute2`) and visit `http://<phone-ip>:3000` from the laptop's browser.

### App boots but DB queries hang forever

pglite is single-process. If you started it twice on the same data dir, kill all and restart:

```bash
pkill -f pglite-server
sleep 1
cd ~/nanoproof-protocol/apps/api
./node_modules/.bin/pglite-server --port=5432 --database=nano-local --data-dir=$HOME/nanoproof-data &
```

### `prisma migrate deploy` complains about missing shadows

```bash
DATABASE_URL=... DATABASE_SHADOW_URL=... ./node_modules/.bin/prisma migrate deploy
```

We don't use `migrate dev` (which tries to read your local Postgres' migration history); `migrate deploy` is the production-style path and works fine against pglite.

---

## What you CAN'T do on Termux (limitations)

- **No `sharp`** — the `next/image` build with image optimization is disabled in our setup; all `/landing` images are pre-baked or use plain `<img>`.
- **No `bcrypt`** — we use `bcryptjs` (pure JS). Sign-up password hashing is ~3x slower (still sub-200ms on a phone).
- **No native queues** — Bull/BullMQ stubs out Redis. x402 endpoints are synchronous (which is fine for the demo, since payments finalize in <2s).
- **Background processes die when you close Termux** — keep Termux in foreground (turn off battery optimization for it: `Settings → Apps → Termux → Battery → Unrestricted`).

---

## Quickstart TL;DR (one giant paste)

If you've already done Option A steps 0–4 once on your phone, this is the recurring boot:

```bash
# tab 1 — db
cd ~/nanoproof-protocol/apps/api && \
  ./node_modules/.bin/pglite-server --port=5432 --database=nano-local \
    --data-dir=$HOME/nanoproof-data &

# tab 2 — api
cd ~/nanoproof-protocol/apps/api && node dist/main.js &

# tab 3 — web
cd ~/nanoproof-protocol/apps/web && pnpm dev
```

Then open `http://127.0.0.1:3000` in Android Chrome.

---

Last verified: 2026-07-05, on `f738b90` (Phase 11 + tour bugfix). README quickstart still assumes Docker — this document supersedes it for Termux.
