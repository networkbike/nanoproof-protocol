# =============================================================================
# NanoProof Web — production Dockerfile (Railway / Fly.io / generic Docker)
# =============================================================================
# This Dockerfile builds the web app as a standalone container. It does NOT
# include the api or its Prisma schema. To avoid running @prisma/client
# postinstall scripts (which require a schema file), we set
# PRISMA_SKIP_POSTINSTALL_GENERATE=1 in the deps stage. Then in the build
# stage we copy in the actual source and run the next build.
# =============================================================================

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Tell Prisma to skip its postinstall engine-download step in this image.
# We'll run prisma generate explicitly where needed (api image), not here.
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

# -----------------------------------------------------------------------------
# Stage 1: install all workspace deps (web-only filter at runtime, but
# pnpm needs the full workspace to resolve shared packages)
# -----------------------------------------------------------------------------
FROM base AS deps
# Copy ONLY the manifests first for layer caching
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
COPY packages/shared/ ./packages/shared/
COPY packages/agent/ ./packages/agent/
COPY apps/web/ ./apps/web/
COPY tsconfig.base.json ./
# Build order: shared first, then agent, then web
RUN pnpm --filter @nanoproof/shared build
RUN pnpm --filter @nanoproof/agent build
RUN pnpm --filter @nanoproof/web build

# -----------------------------------------------------------------------------
# Stage 3: runtime (minimal final image)
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Copy everything needed at runtime
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/web ./apps/web
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/package.json ./

# Copy the built .next/ output explicitly. The COPY of apps/web above
# already includes .next/, but be defensive in case layer ordering shifts
# it elsewhere.
COPY --from=build /repo/apps/web/.next ./apps/web/.next

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["sh", "-c", "PORT=3000 HOSTNAME=0.0.0.0 node node_modules/next/dist/bin/next start -p 3000"]
