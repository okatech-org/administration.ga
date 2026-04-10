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
}

export default nextConfig
