# =============================================================================
# NanoProof API — production Dockerfile (Fly.io / generic Docker)
#
# Why this exists:
#   Render's free tier has fundamental incompatibilities with pnpm monorepos
#   + Node 22 + corepack. The runner.sh initialization that Render's native
#   Node runtime relies on breaks when custom buildCommands are used.
#   Fly.io gives us a real container with full control, so this Dockerfile
#   is straightforward and reliable.
#
# Build strategy (3 stages, all pnpm-based, fully hermetic):
#   1. base:    node:22-bookworm-slim + pnpm 9.15.9 via corepack
#   2. deps:    install all workspace deps (cached layer on lockfile change)
#   3. build:   build shared package + api, generate prisma client
#   4. runtime: copy deps + built artifacts into a minimal final image
# =============================================================================

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# corepack 0.31+ ships with Node 22 and has the new npm signing keys
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

# -----------------------------------------------------------------------------
# Stage 1: install all workspace deps
# -----------------------------------------------------------------------------
FROM base AS deps
# Copy ONLY manifests first for layer caching (deps rebuild only on lockfile change)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY contracts/ ./contracts/
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 2: build
# -----------------------------------------------------------------------------
FROM deps AS build
# Now copy source code (deps already installed)
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/
COPY tsconfig.base.json ./
# Build order: shared first, then api
RUN pnpm --filter @nanoproof/shared build
RUN pnpm --filter @nanoproof/api db:generate
RUN pnpm --filter @nanoproof/api build

# -----------------------------------------------------------------------------
# Stage 3: runtime (minimal final image)
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

# Prisma 5.22's native query engine ships with libquery_engine-debian-openssl-3.0.x.so.node
# which dynamically links against libssl.so.3. node:22-bookworm-slim does NOT ship libssl3
# by default, so we must install it explicitly. Without this, Prisma's _r.loadEngine() call
# inside $connect() fails with errorCode: undefined and the api crashes at startup.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       openssl ca-certificates libssl3 libc6 libstdc++6 \
  && ldconfig \
  && rm -rf /var/lib/apt/lists/* \
  && ldconfig -p | grep libssl

ENV NODE_ENV=production
ENV PORT=4000

# Copy everything needed at runtime
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api ./apps/api
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/package.json ./

WORKDIR /app/apps/api

EXPOSE 4000

# Disable Docker-level healthcheck so Railway doesn't kill the container
# before /health responds (NestJS startup can take >100s with Prisma init).
HEALTHCHECK NONE

# Migrations run at container start (DATABASE_URL injected as env var by Fly).
# Falls back to lazy Prisma init on first DB query if migrate fails.
# Then the api starts.
# Migration runs in code (prisma.service.ts onModuleInit) so we get
# full NestJS logging and proper error reporting. If the migration
# fails, the api throws and the container fails to start, surfacing
# the real error in Railway's deploy log.
CMD ["sh", "-c", "echo '=== starting api (migration runs in onModuleInit) ===' && exec node dist/apps/api/src/main.js"]
