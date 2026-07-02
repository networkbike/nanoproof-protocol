# =============================================================================
# NanoProof Web — ISOLATED production Dockerfile (Railway)
# =============================================================================
# This Dockerfile builds ONLY the web app, with the shared/agent packages
# vendored as tarballs. It does NOT include the api, prisma, or the
# @prisma/* packages — so the pnpm install won't trigger Prisma postinstall
# scripts that require a Prisma schema.
# =============================================================================

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Belt-and-suspenders: skip Prisma postinstall globally
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
ENV PRISMA_GENERATE_SKIP_AUTO_CONFIG=1
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

# -----------------------------------------------------------------------------
# Stage 1: install web-only deps with a filtered workspace
# -----------------------------------------------------------------------------
# We temporarily replace pnpm-workspace.yaml with one that ONLY includes
# apps/web and packages/{shared,agent}. This ensures pnpm doesn't try to
# install the api, contracts, or any @prisma/* packages.
FROM base AS deps
# Copy everything first
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
# Save the original workspace file in case other tooling needs it
RUN cp pnpm-workspace.yaml pnpm-workspace.yaml.bak
# Create a web-only workspace file
RUN cat > pnpm-workspace.yaml <<'EOF'
packages:
  - "apps/web"
  - "packages/shared"
  - "packages/agent"
EOF
# Now install — only web, shared, agent
RUN pnpm install --frozen-lockfile
# Restore the original workspace file (for the build stage)
RUN mv pnpm-workspace.yaml.bak pnpm-workspace.yaml

# -----------------------------------------------------------------------------
# Stage 2: build
# -----------------------------------------------------------------------------
FROM deps AS build
# Source already copied. Just build.
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

# Copy everything we need
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/web ./apps/web
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/package.json ./
# Explicitly copy .next in case the apps/web COPY missed it
COPY --from=build /repo/apps/web/.next ./apps/web/.next

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["sh", "-c", "PORT=3000 HOSTNAME=0.0.0.0 node node_modules/next/dist/bin/next start -p 3000"]
