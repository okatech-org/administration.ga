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
    "@convex-dev/better-auth",
    "@convex-dev/react-query",
  ],
  turbopack: {
    resolveAlias: {
      // IMPORTANT : alias vers le workspace root (../../node_modules/…),
      // pas vers ./node_modules qui n'existe pas pour cette app sous Bun
      // (dedupe laisse parfois des symlinks manquants). Sans cet alias
      // correct, `@tanstack/react-query` peut être résolu vers 2 instances
      // différentes (ici + packages/api), ce qui casse le context React
      // → "No QueryClient set" dans SuperadminGuard.
      "@tanstack/react-query": "../../node_modules/@tanstack/react-query",
      i18next: "../../node_modules/i18next",
      convex: "../../node_modules/convex",
      "convex/react": "../../node_modules/convex/react",
      "convex/server": "../../node_modules/convex/server",
      "convex/values": "../../node_modules/convex/values",
      "convex/browser": "../../node_modules/convex/browser",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@tanstack/react-query": path.resolve(
        __dirname,
        "../../node_modules/@tanstack/react-query",
      ),
      i18next: path.resolve(__dirname, "../../node_modules/i18next"),
      convex: path.resolve(__dirname, "../../node_modules/convex"),
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
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://*.convex.cloud https://*.posthog.com`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              `connect-src 'self' ${isDev ? "http://127.0.0.1:* ws://127.0.0.1:* ws://localhost:*" : ""} https://*.convex.cloud https://*.convex.site wss://*.convex.cloud https://*.posthog.com https://*.stripe.com https://*.mapbox.com https://api.livekit.cloud wss://*.livekit.cloud`,
              "frame-src https://*.stripe.com",
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
        has: [{ type: "host", value: "www.admin.consulat.ga" }],
        destination: "https://admin.consulat.ga/:path*",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
