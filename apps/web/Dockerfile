# =============================================================================
# NanoProof Web — production Dockerfile (Railway) — ISOLATED BUILD
# =============================================================================
# Strategy: standalone Next.js build. Use --ignore-scripts on pnpm
# install to skip Prisma/esbuild postinstalls (the web doesn't need them).
# Run the next build explicitly. Copy the .next/ output to the runtime
# stage.
# =============================================================================

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

# -----------------------------------------------------------------------------
# Stage 1: install (no postinstalls)
# -----------------------------------------------------------------------------
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY contracts/ ./contracts/
RUN pnpm install --frozen-lockfile --ignore-scripts

# -----------------------------------------------------------------------------
# Stage 2: build
# -----------------------------------------------------------------------------
FROM deps AS build
COPY packages/shared/ ./packages/shared/
COPY packages/agent/ ./packages/agent/
COPY apps/web/ ./apps/web/
COPY tsconfig.base.json ./
RUN pnpm --filter @nanoproof/shared build
RUN pnpm --filter @nanoproof/agent build
# Standalone Next.js output: includes a `server.js` and copies of node_modules
# that the runtime needs.
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @nanoproof/web build

# -----------------------------------------------------------------------------
# Stage 3: runtime — minimal, just node + the built artifacts
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

# Copy the entire built web app
COPY --from=build /repo/apps/web ./apps/web
# Copy node_modules and packages for runtime deps
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/package.json ./

WORKDIR /app/apps/web

EXPOSE 3000

# Use bash explicitly (not sh -c) for maximum portability. NODE_ENV=production
# is set. HOSTNAME=0.0.0.0 binds to all interfaces so Railway can route to it.
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
