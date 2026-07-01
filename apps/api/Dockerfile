# =============================================================================
# NanoProof API — production Dockerfile (Render runtime: docker)
#
# Bypasses Render's native Node runtime's old-corepack problem by building
# in a fresh node:22 image where corepack has the new signing keys.
# =============================================================================

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

# -----------------------------------------------------------------------------
# Stage 1: install all workspace deps (cached on lockfile change)
# -----------------------------------------------------------------------------
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY contracts/ ./contracts/
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 2: build shared + api
# -----------------------------------------------------------------------------
FROM deps AS build
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/
COPY tsconfig.base.json ./
RUN pnpm --filter @nanoproof/shared build
RUN pnpm --filter @nanoproof/api db:generate
RUN pnpm --filter @nanoproof/api build

# -----------------------------------------------------------------------------
# Stage 3: runtime (minimal)
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api ./apps/api
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/package.json ./

WORKDIR /app/apps/api

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the API. Migrations run on first request via Prisma's lazy init,
# OR we can pre-apply via `npx prisma migrate deploy` before node starts.
CMD ["sh", "-c", "node dist/apps/api/src/main.js"]
