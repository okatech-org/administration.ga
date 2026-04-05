# ── Stage 1: Install + Build ───────────────────────────
FROM oven/bun:1.2.17 AS builder

WORKDIR /app

# Build-time env vars (VITE_* are inlined at build time by Vite)
ARG VITE_CONVEX_URL
ARG VITE_CONVEX_SITE_URL
ARG VITE_SITE_URL
# Expose CONVEX_SITE_URL for Nitro server-side (auth proxy)
ENV CONVEX_SITE_URL=${VITE_CONVEX_SITE_URL}
ARG VITE_POSTHOG_KEY
ARG VITE_POSTHOG_HOST

# Copy everything (filtered by .dockerignore at repo root)
COPY . .

# Install dependencies
RUN bun install

# Build the backoffice app
RUN cd apps/backoffice-web && bun run build

# ── Stage 2: Production image ─────────────────────────
FROM oven/bun:1.2.17-alpine AS runner

WORKDIR /app

# Copy only the Nitro server output
COPY --from=builder /app/apps/backoffice-web/.output ./.output

# Runtime env vars injectees par Cloud Run / docker run -e
ARG VITE_CONVEX_SITE_URL
ENV CONVEX_SITE_URL=${VITE_CONVEX_SITE_URL}
ENV NODE_ENV=production
ENV PORT=8080

USER bun

EXPOSE 8080

CMD ["bun", ".output/server/index.mjs"]
