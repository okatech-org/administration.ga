import { withPostHogConfig } from "@posthog/nextjs-config"
import type { NextConfig } from "next"
import path from "node:path"

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    "@workspace/api",
    "@workspace/ui",
    "@workspace/i18n",
    "@workspace/shared",
    "@workspace/posthog-shared",
  ],
  turbopack: {
    // Force la racine du monorepo (sinon Turbopack 16 auto-detecte `/apps/`
    // comme racine, ce qui casse la resolution des @import CSS).
    root: path.resolve(__dirname, "../.."),
    resolveAlias: {
      "@tanstack/react-query": "./node_modules/@tanstack/react-query",
      i18next: "./node_modules/i18next",
    },
  },
  webpack: (config) => {
    // Force single copy of packages that rely on React context
    // to avoid "No QueryClient set" errors from duplicate instances
    config.resolve.alias = {
      ...config.resolve.alias,
      "@tanstack/react-query": path.resolve(
        __dirname,
        "node_modules/@tanstack/react-query",
      ),
      i18next: path.resolve(__dirname, "node_modules/i18next"),
    }
    return config
  },
  experimental: {},
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.convex.cloud" },
      { protocol: "https", hostname: "*.convex.site" },
    ],
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== "production"
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://*.convex.cloud https://*.posthog.com https://api.mapbox.com`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com",
              "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "worker-src 'self' blob:",
              `connect-src 'self' ${isDev ? "http://127.0.0.1:* ws://127.0.0.1:* ws://localhost:*" : ""} https://*.convex.cloud https://*.convex.site wss://*.convex.cloud https://*.posthog.com https://*.mapbox.com https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com https://api.livekit.cloud wss://*.livekit.cloud`,
              "frame-src 'self' blob:",
              "media-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.demarche.ga" }],
        destination: "https://demarche.ga/:path*",
        permanent: true,
      },
    ]
  },
  /**
   * Réécritures d'URL — ADMINISTRATION.GA.
   *
   * `/demarches/*` est l'URL publique canonique pour l'espace utilisateur côté
   * citoyen/entreprise (terminologie administrative). En interne, les pages
   * sont rendues sous `/my-space/*` (chemin historique consulat.ga, conservé
   * pour ne pas casser les liens existants). Le rewrite est transparent pour
   * l'utilisateur : l'URL reste `/demarches/...` dans la barre d'adresse mais
   * Next.js sert les composants `/my-space/...`.
   */
  async rewrites() {
    return [
      { source: "/demarches", destination: "/my-space" },
      { source: "/demarches/:path*", destination: "/my-space/:path*" },
    ]
  },
}

// Source maps upload activé uniquement si POSTHOG_PERSONAL_API_KEY est fourni
// au build (cf. workflow CI Cloud Run). Sinon export brut — pas de plantage en dev.
export default process.env.POSTHOG_PERSONAL_API_KEY
  ? withPostHogConfig(nextConfig, {
      personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
      envId: process.env.POSTHOG_ENV_ID ?? "",
      host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      sourcemaps: {
        enabled: true,
        project: "citizen-web",
        version: process.env.GITHUB_SHA,
      },
    })
  : nextConfig
