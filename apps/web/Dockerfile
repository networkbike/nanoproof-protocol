# =============================================================================
# NanoProof Web — production Dockerfile (Railway) — ISOLATED BUILD
# =============================================================================
# Strategy:
# 1. Install ALL workspace deps (with --ignore-scripts to skip Prisma/etc)
# 2. Build only the web's workspace deps (shared, agent, then web)
# 3. Runtime copies the entire apps/web directory + .next output
# =============================================================================

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

# -----------------------------------------------------------------------------
# Stage 1: install
# -----------------------------------------------------------------------------
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY contracts/ ./contracts/
RUN pnpm install --frozen-lockfile --ignore-scripts

# -----------------------------------------------------------------------------
# Stage 2: build web + workspace deps
# -----------------------------------------------------------------------------
FROM deps AS build
COPY packages/shared/ ./packages/shared/
COPY packages/agent/ ./packages/agent/
COPY apps/web/ ./apps/web/
COPY tsconfig.base.json ./
ENV NEXT_TELEMETRY_DISABLED=1
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

# Copy the entire apps/web directory (includes .next/ from build)
COPY --from=build /repo/apps/web /app/apps/web
# Copy node_modules for runtime deps
COPY --from=build /repo/node_modules /app/node_modules
# Copy packages (workspace deps for the web)
COPY --from=build /repo/packages /app/packages

WORKDIR /app/apps/web

EXPOSE 3000

# Direct argv CMD (no shell). Bind to 0.0.0.0 so Railway can route.
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
