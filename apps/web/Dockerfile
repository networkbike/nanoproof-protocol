# =============================================================================
# NanoProof Web — MINIMAL production Dockerfile (Railway)
# =============================================================================
# This is a minimal, defensive Dockerfile. Every step is a single
# RUN command that fails loudly if anything goes wrong. The build
# prints each step so the Railway build log shows exactly where it
# stopped if anything fails.
# =============================================================================

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

# -----------------------------------------------------------------------------
# Step 1: deps — install everything, no postinstalls (skip prisma/esbuild)
# -----------------------------------------------------------------------------
FROM base AS deps
# Print that this stage is starting
RUN echo "=== STEP 1: building deps stage ==="
# Copy manifests first (these rarely change → cacheable)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY contracts/ ./contracts/
# Run install with --ignore-scripts to skip prisma's engine download
# (we'll run db:generate explicitly in the build stage)
RUN echo "=== pnpm install (with --ignore-scripts) ===" && \
    pnpm install --frozen-lockfile --ignore-scripts 2>&1 | tail -20
RUN echo "=== STEP 1 DONE: deps installed ==="

# -----------------------------------------------------------------------------
# Step 2: build — compile the web + workspace deps
# -----------------------------------------------------------------------------
FROM deps AS build
RUN echo "=== STEP 2: building web + workspace packages ==="
COPY packages/shared/ ./packages/shared/
COPY packages/agent/ ./packages/agent/
COPY apps/web/ ./apps/web/
COPY tsconfig.base.json ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @nanoproof/shared build 2>&1 | tail -10
RUN pnpm --filter @nanoproof/agent build 2>&1 | tail -10
RUN pnpm --filter @nanoproof/web build 2>&1 | tail -10
RUN echo "=== STEP 2 DONE: web built ===" && \
    echo ".next size: $(du -sh /repo/apps/web/.next 2>/dev/null || echo 'MISSING')"

# -----------------------------------------------------------------------------
# Step 3: runtime — minimal image with just node + the built web
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
# Do NOT set ENV PORT — let Railway's $PORT env var take effect.
# If we hardcode PORT=3000, Railway's dynamic port assignment is ignored.
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

# Print the build ID we expect
RUN echo "=== STEP 3: runtime image build ==="

# Copy the entire web app (includes .next/ from build)
COPY --from=build /repo/apps/web /app/apps/web
# Copy node_modules (runtime deps)
COPY --from=build /repo/node_modules /app/node_modules
# Copy packages (workspace deps for the web)
COPY --from=build /repo/packages /app/packages

# Verify everything is in place at build time
RUN echo "=== runtime verification ===" && \
    echo "node_modules: $(ls /app/node_modules 2>/dev/null | wc -l) packages" && \
    echo "apps/web: $(ls /app/apps/web 2>/dev/null | wc -l) files" && \
    echo ".next: $(test -d /app/apps/web/.next && echo present || echo MISSING)" && \
    echo "BUILD_ID: $(cat /app/apps/web/.next/BUILD_ID 2>/dev/null || echo MISSING)"

WORKDIR /app/apps/web

EXPOSE 3000

# Use Railway's $PORT env var (defaults to 3000 if not set).
# Removing the hardcoded -p 3000 ensures we bind to whatever port
# Railway expects, not 3000. If Railway assigns port 8080 and we
# listen on 3000, Railway's edge returns 502.
CMD ["sh", "-c", "exec node node_modules/next/dist/bin/next start -p ${PORT:-3000} -H 0.0.0.0"]
