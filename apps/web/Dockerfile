# =============================================================================
# NanoProof Web — production Dockerfile (Render runtime: docker)
# =============================================================================

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY contracts/ ./contracts/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared/ ./packages/shared/
COPY packages/agent/ ./packages/agent/
COPY apps/web/ ./apps/web/
COPY tsconfig.base.json ./
RUN pnpm --filter @nanoproof/shared build
RUN pnpm --filter @nanoproof/agent build
RUN pnpm --filter @nanoproof/web build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/web ./apps/web
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/package.json ./

WORKDIR /app/apps/web

# Render injects PORT=10000 for web services. Next.js reads PORT env var
# when started with -p $PORT. EXPOSE 10000 for the port scan.
EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD sh -c 'node -e "require(\"http\").get(\"http://localhost:10000\", r => process.exit(r.statusCode < 500 ? 0 : 1)).on(\"error\", () => process.exit(1))"'

CMD ["sh", "-c", "PORT=10000 HOSTNAME=0.0.0.0 node node_modules/next/dist/bin/next start -p 10000"]
