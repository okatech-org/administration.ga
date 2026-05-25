import { withPostHogConfig } from "@posthog/nextjs-config"
import type { NextConfig } from "next"
import path from "node:path"

const isDev = process.env.NODE_ENV === "development"

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
    "@workspace/routing",
    "@workspace/agent-features",
    "@workspace/posthog-shared",
    "@convex-dev/better-auth",
    "@convex-dev/react-query",
  ],
  turbopack: {
    resolveAlias: {
      "@tanstack/react-query": "./node_modules/@tanstack/react-query",
      i18next: "./node_modules/i18next",
      convex: "./node_modules/convex",
      "convex/react": "./node_modules/convex/react",
      "convex/server": "./node_modules/convex/server",
      "convex/values": "./node_modules/convex/values",
      "convex/browser": "./node_modules/convex/browser",
      // pdfjs-dist tente d'importer le polyfill `canvas` (Node only) ;
      // on l'alias vers un module vide pour le bundle navigateur.
      canvas: "./empty-module.js",
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
      convex: path.resolve(__dirname, "node_modules/convex"),
      // pdfjs-dist tente d'importer le polyfill `canvas` (Node only).
      canvas: false,
    }
    return config
  },
  experimental: {},
  async headers() {
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
              // Mapbox GL exécute des scripts depuis api.mapbox.com pour
              // les styles vectoriels — sans cette autorisation, le globe
              // rend en wireframe sans pays/continents.
              `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://*.convex.cloud https://*.posthog.com https://api.mapbox.com`,
              "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
              "style-src-elem 'self' 'unsafe-inline' https://api.mapbox.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // Workers Mapbox (rendu vectoriel hors thread principal).
              "worker-src 'self' blob:",
              // Tiles + events Mapbox doivent être listés explicitement.
              `connect-src 'self' ${isDev ? "http://127.0.0.1:* ws://127.0.0.1:* ws://localhost:*" : ""} https://*.convex.cloud https://*.convex.site wss://*.convex.cloud https://*.posthog.com https://*.stripe.com https://*.mapbox.com https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com https://api.livekit.cloud wss://*.livekit.cloud https://livekit.consulat.ga wss://livekit.consulat.ga wss://generativelanguage.googleapis.com https://generativelanguage.googleapis.com https://api.openai.com wss://api.openai.com`,
              "frame-src 'self' blob: https://*.stripe.com",
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
        has: [{ type: "host", value: "www.emploi.administration.ga" }],
        destination: "https://emploi.administration.ga/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.pnpe.ga" }],
        destination: "https://emploi.administration.ga/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "pnpe.ga" }],
        destination: "https://emploi.administration.ga/:path*",
        permanent: true,
      },
      // /iasted -> /icom (route renamed; preserve old bookmarks and query params)
      {
        source: "/iasted",
        destination: "/icom",
        permanent: true,
      },
      {
        source: "/iasted/:path*",
        destination: "/icom/:path*",
        permanent: true,
      },
      // /intelligence -> /agence (module recantonné sous /agence/* après
      // migration vers le type d'organisme intelligence_agency).
      {
        source: "/intelligence",
        destination: "/agence",
        permanent: true,
      },
      {
        source: "/intelligence/:path*",
        destination: "/agence/:path*",
        permanent: true,
      },
    ]
  },
}

// PostHog source maps : prod/CI uniquement. Désactivé en dev local.
export default process.env.POSTHOG_PERSONAL_API_KEY &&
  process.env.NODE_ENV === "production"
  ? withPostHogConfig(nextConfig, {
      personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
      envId: process.env.POSTHOG_ENV_ID ?? "",
      host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      sourcemaps: {
        enabled: true,
        project: "pnpe-gabon",
        version: process.env.GITHUB_SHA,
      },
    })
  : nextConfig
