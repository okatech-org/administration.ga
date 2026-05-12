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
              `connect-src 'self' ${isDev ? "http://127.0.0.1:* ws://127.0.0.1:* ws://localhost:*" : ""} https://*.convex.cloud https://*.convex.site wss://*.convex.cloud https://*.posthog.com https://*.stripe.com https://*.mapbox.com https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com https://api.livekit.cloud wss://*.livekit.cloud https://livekit.consulat.ga wss://livekit.consulat.ga wss://generativelanguage.googleapis.com https://generativelanguage.googleapis.com`,
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
        has: [{ type: "host", value: "www.diplomate.ga" }],
        destination: "https://diplomate.ga/:path*",
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

export default nextConfig
