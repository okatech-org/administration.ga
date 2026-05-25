# ── Stage 1: Install + Build ───────────────────────────
FROM oven/bun:1.2.17 AS builder

WORKDIR /app

# Build-time env vars (NEXT_PUBLIC_* sont inlines au build par Next.js)
ARG NEXT_PUBLIC_CONVEX_URL
ARG CONVEX_SITE_URL
ARG NEXT_PUBLIC_SITE_URL
ARG GITHUB_SHA
ENV GITHUB_SHA=$GITHUB_SHA

# Copy everything (filtered by .dockerignore at repo root)
COPY . .

# Install dependencies
RUN bun install

# Build the travail-ga app (Next.js standalone output)
RUN cd apps/travail-ga && bun run build

# ── Stage 2: Production image ─────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Copy Next.js standalone server
COPY --from=builder /app/apps/travail-ga/.next/standalone ./
# Copy static assets
COPY --from=builder /app/apps/travail-ga/.next/static ./apps/travail-ga/.next/static
# Copy public assets
COPY --from=builder /app/apps/travail-ga/public ./apps/travail-ga/public

# Runtime env vars injected by Cloud Run
ARG CONVEX_SITE_URL
ENV CONVEX_SITE_URL=${CONVEX_SITE_URL}

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 8080

CMD ["node", "apps/travail-ga/server.js"]
