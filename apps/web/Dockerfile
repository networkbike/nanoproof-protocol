# =============================================================================
# NanoProof Web — Single-stage Dockerfile (Railway)
# =============================================================================
# One stage. Faster builds than multi-stage. Uses Railway's $PORT.
# =============================================================================

FROM node:22-bookworm-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
# Don't set ENV PORT — let Railway's runtime PORT take effect.

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

# Copy manifests
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY contracts/ ./contracts/

# Install — skip prisma postinstalls (we don't need them for the web)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source
COPY packages/shared/ ./packages/shared/
COPY packages/agent/ ./packages/agent/
COPY apps/web/ ./apps/web/
COPY tsconfig.base.json ./

# Build workspace deps + web — single pnpm invocation for speed
RUN pnpm --filter @nanoproof/shared build && \
    pnpm --filter @nanoproof/agent build && \
    pnpm --filter @nanoproof/web build

# Verify build output exists
RUN echo "Build output:" && ls /repo/apps/web/.next/BUILD_ID 2>&1 || echo "BUILD_ID missing"

WORKDIR /repo/apps/web

EXPOSE 3000

# Use Railway's $PORT (defaults to 3000 if unset). Critical: -p ${PORT}
# not -p 3000, so we bind to whatever Railway assigned.
CMD ["sh", "-c", "exec node node_modules/next/dist/bin/next start -p ${PORT:-3000} -H 0.0.0.0"]
