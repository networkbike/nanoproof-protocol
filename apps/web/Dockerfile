# =============================================================================
# NanoProof Web — production Dockerfile (Railway) — ISOLATED BUILD
# =============================================================================
# Strategy: use the FULL workspace (with catalogs) but skip ALL postinstall
# scripts. Then run only the web build. This avoids the lockfile mismatch
# AND avoids any prisma postinstall failures.
# =============================================================================

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Skip ALL postinstall scripts (no prisma, no esbuild, no nothing).
# We'll only need compiled JS for next, no native deps.
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

# -----------------------------------------------------------------------------
# Stage 1: install (no postinstall scripts, with frozen lockfile)
# -----------------------------------------------------------------------------
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY contracts/ ./contracts/
# Use --ignore-scripts to skip ALL postinstall scripts (Prisma, esbuild, etc.)
# The lockfile IS compatible since we're using the full workspace file unchanged.
RUN pnpm install --frozen-lockfile --ignore-scripts

# -----------------------------------------------------------------------------
# Stage 2: build (web only)
# -----------------------------------------------------------------------------
FROM deps AS build
COPY packages/shared/ ./packages/shared/
COPY packages/agent/ ./packages/agent/
COPY apps/web/ ./apps/web/
COPY tsconfig.base.json ./
RUN pnpm --filter @nanoproof/shared build
RUN pnpm --filter @nanoproof/agent build
RUN pnpm --filter @nanoproof/web build

# -----------------------------------------------------------------------------
# Stage 3: runtime
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

# Copy runtime artifacts
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/web ./apps/web
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/package.json ./
# Explicit .next copy
COPY --from=build /repo/apps/web/.next ./apps/web/.next

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["sh", "-c", "PORT=3000 HOSTNAME=0.0.0.0 node node_modules/next/dist/bin/next start -p 3000"]
