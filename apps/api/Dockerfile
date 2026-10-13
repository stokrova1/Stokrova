# ==============================================================================
# STOKROVA Core API Server — Multi-Stage Production Containerfile
# Hardened, distroless-inspired Alpine, non-root execution, dumb-init signal handling.
# ==============================================================================

# Stage 1: Build & Dependencies
FROM node:24-alpine AS builder

WORKDIR /app

# Install build dependencies and pnpm
RUN apk add --no-cache libc6-compat python3 make g++ \
  && corepack enable && corepack prepare pnpm@12.9.1 --activate

# Copy monorepo configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json turbo.json* ./

# Copy package descriptors across monorepo
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY apps/admin-web/ ./apps/admin-web/
COPY apps/pos-desktop/ ./apps/pos-desktop/
COPY apps/mobile/ ./apps/mobile/

# Install all monorepo dependencies
RUN pnpm install --frozen-lockfile

# Build workspace packages & apps/api
RUN pnpm --filter @stokrova/config run build \
  && pnpm --filter @stokrova/contracts run build \
  && pnpm --filter @stokrova/domain run build \
  && pnpm --filter @stokrova/validation run build \
  && pnpm --filter @stokrova/database run build \
  && pnpm --filter @stokrova/sync run build \
  && pnpm --filter @stokrova/ui run build \
  && pnpm --filter @stokrova/api run build

# Stage 2: Minimal Production Runtime
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Install dumb-init for proper PID 1 signal forwarding
RUN apk add --no-cache dumb-init curl

# Create non-root system user and group
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs stokrova

# Copy built artifacts and dependencies from builder
COPY --chown=stokrova:nodejs --from=builder /app/package.json ./package.json
COPY --chown=stokrova:nodejs --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --chown=stokrova:nodejs --from=builder /app/node_modules ./node_modules
COPY --chown=stokrova:nodejs --from=builder /app/packages ./packages
COPY --chown=stokrova:nodejs --from=builder /app/apps/api/dist ./apps/api/dist
COPY --chown=stokrova:nodejs --from=builder /app/apps/api/package.json ./apps/api/package.json

USER stokrova

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/api/dist/main.js"]
