# =============================================================================
# NanoProof Web — ULTRA-MINIMAL Dockerfile (Railway)
# =============================================================================
# Bare-bones. Just enough to build and run Next.js on Railway's port.
# No fancy optimizations — just the minimum to ship.
# =============================================================================

FROM node:22-bookworm-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# corepack
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

# Copy lockfile + package.jsons first (cached layer)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/agent/package.json ./packages/agent/
COPY apps/web/package.json ./apps/web/

# Install ONLY web + workspace deps
RUN pnpm install --frozen-lockfile --ignore-scripts

# Now copy source and build
COPY packages/shared/ ./packages/shared/
COPY packages/agent/ ./packages/agent/
COPY apps/web/ ./apps/web/
COPY tsconfig.base.json ./
RUN cd /app/apps/web && pnpm exec next build

WORKDIR /app/apps/web

EXPOSE 3000
CMD ["sh", "-c", "exec pnpm exec next start -p ${PORT:-3000} -H 0.0.0.0"]
