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
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# PostHog source maps upload (build-only, jamais propagé au stage runner)
ARG POSTHOG_PERSONAL_API_KEY
ARG POSTHOG_ENV_ID
ARG GITHUB_SHA
ENV POSTHOG_PERSONAL_API_KEY=$POSTHOG_PERSONAL_API_KEY
ENV POSTHOG_ENV_ID=$POSTHOG_ENV_ID
ENV GITHUB_SHA=$GITHUB_SHA

# Copy everything (filtered by .dockerignore at repo root)
COPY . .

# Install dependencies
RUN bun install

# Build the pnpe app (Next.js standalone output)
RUN cd apps/pnpe && bun run build

# ── Stage 2: Production image ─────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Copy Next.js standalone server
COPY --from=builder /app/apps/pnpe/.next/standalone ./
# Copy static assets
COPY --from=builder /app/apps/pnpe/.next/static ./apps/pnpe/.next/static
# Copy public assets
COPY --from=builder /app/apps/pnpe/public ./apps/pnpe/public

# Runtime env vars injected by Cloud Run
ARG CONVEX_SITE_URL
ENV CONVEX_SITE_URL=${CONVEX_SITE_URL}

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 8080

CMD ["node", "apps/pnpe/server.js"]
