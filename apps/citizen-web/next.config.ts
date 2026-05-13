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
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.consulat.ga" }],
        destination: "https://consulat.ga/:path*",
        permanent: true,
      },
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
