# ── Stage 1: Install + Build ───────────────────────────
FROM oven/bun:1.2.17 AS builder

WORKDIR /app

# Build-time env vars (NEXT_PUBLIC_* are inlined at build time by Next.js)
ARG NEXT_PUBLIC_CONVEX_URL
ARG CONVEX_SITE_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_LIVEKIT_WS_URL
ARG NEXT_PUBLIC_MAPBOX_TOKEN

# Copy everything (filtered by .dockerignore at repo root)
COPY . .

# Install dependencies
RUN bun install

# Build the users-web app (Next.js standalone output)
RUN cd apps/users-web && bun run build

# ── Stage 2: Production image ─────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Copy Next.js standalone server
COPY --from=builder /app/apps/users-web/.next/standalone ./
# Copy static assets
COPY --from=builder /app/apps/users-web/.next/static ./apps/users-web/.next/static
# Copy public assets
COPY --from=builder /app/apps/users-web/public ./apps/users-web/public

# Runtime env vars injected by Cloud Run
ARG CONVEX_SITE_URL
ENV CONVEX_SITE_URL=${CONVEX_SITE_URL}

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 8080

CMD ["node", "apps/users-web/server.js"]
