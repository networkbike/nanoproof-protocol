# Web 502 Debug Steps

The web service on Railway is returning HTTP 502 with `x-railway-fallback: true`. This means no container is responding.

## To debug, do these steps in order

### Step 1: Open Railway
- Go to https://railway.app/dashboard
- Click the project `fantastic-tenderness` (or whatever your project is named)
- Click the `nanoproof-web` service

### Step 2: Open the latest deployment
- Click the `Deployments` tab
- The newest deployment is at the top (it should say "fix(web): add runtime diagnostic...")
- Click that deployment

### Step 3: Read the Build log
- Click the `Build` tab
- Scroll through the build output
- Look for these KEY lines near the end:

**Good build looks like:**
```
=> pnpm install --frozen-lockfile --ignore-scripts
Done in 30s
=> pnpm --filter @nanoproof/web build
✓ Compiled successfully
=> Successfully built abc123def
=> Image pushed
```

**Bad build looks like:**
```
=> ERROR: ...
=> pnpm install: ...lockfile mismatch...
=> Failed to compile...
=> Command failed with exit code 1
```

### Step 4: Read the Deploy log
- Click the `Deploy` tab
- Look for these KEY lines from our diagnostic:

**Good:**
```
=== web runtime build complete ===
node_modules count: 1234
apps/web count: 25
.next present: yes
.next/BUILD_ID: abc123...
```

**Bad:**
```
=== web runtime build complete ===
node_modules count: 0       <-- MISSING
apps/web count: 0           <-- MISSING
.next present: no           <-- MISSING
```

### Step 5: Take a screenshot

Take a screenshot of the Deploy log and send it to me. I'll know exactly what's wrong from the output.

---

## What I expect to find

The most likely cause is one of:
1. **The build is failing silently** with a pnpm error
2. **The COPY commands aren't propagating** `.next/` to the runtime image
3. **The container is crashing** at startup (less likely since CMD is a simple argv)

## If you can read the build log yourself

Look for these patterns and tell me what you see:

| Build log line | Meaning |
|---|---|
| `pnpm install --frozen-lockfile --ignore-scripts` → "Done" | Install succeeded |
| `pnpm --filter @nanoproof/web build` → "Compiled successfully" | Build succeeded |
| `pnpm --filter @nanoproof/web build` → "Failed to compile" | Build FAILED — share this error |
| `Successfully built` followed by `Image pushed` | Image built, deploy should start |
| `failed to solve` or `executor failed` | Dockerfile COPY error — share this |

## Meanwhile, the API is fully working

The API at `https://nanoproof-api-production.up.railway.app` is fully operational. The web is the only blocker.

## What to do right now

1. Open Railway dashboard
2. Go to nanoproof-web → Deployments → latest → Deploy tab
3. Take a screenshot of the deploy log (it'll show our diagnostic output)
4. Send the screenshot to me
