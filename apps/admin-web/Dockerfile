# ==============================================================================
# STOKROVA Admin Web Management Console — Multi-Stage Production Containerfile
# High-performance Nginx Alpine static web server with hardened security headers.
# ==============================================================================

# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.9.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/admin-web/ ./apps/admin-web/

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @stokrova/config run build \
  && pnpm --filter @stokrova/contracts run build \
  && pnpm --filter @stokrova/domain run build \
  && pnpm --filter @stokrova/ui run build \
  && pnpm --filter @stokrova/admin-web run build

# Stage 2: Nginx Static Serving
FROM nginx:alpine AS runner

# Security headers configuration
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Hardened Security Headers \
    add_header X-Frame-Options "SAMEORIGIN" always; \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header X-XSS-Protection "1; mode=block" always; \
    add_header Referrer-Policy "strict-origin-when-cross-origin" always; \
    add_header Content-Security-Policy "default-src '"'self'"'; script-src '"'self'"' '"'unsafe-inline'"'; style-src '"'self'"' '"'unsafe-inline'"'; font-src '"'self'"' data:; img-src '"'self'"' data: https:; connect-src '"'self'"' ws: wss:;" always; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /health { \
        access_log off; \
        return 200 "healthy\n"; \
    } \
}' > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/apps/admin-web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=20s --timeout=3s --retries=3 \
  CMD wget -q --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
