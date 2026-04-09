import type { NextConfig } from "next"
import path from "node:path"

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: false,
  transpilePackages: [
    "@workspace/api",
    "@workspace/ui",
    "@workspace/i18n",
    "@workspace/shared",
  ],
  webpack: (config) => {
    // Force single copy of packages that rely on React context
    // to avoid "No QueryClient set" errors from duplicate instances
    config.resolve.alias = {
      ...config.resolve.alias,
      "@tanstack/react-query": path.resolve(
        __dirname,
        "node_modules/@tanstack/react-query",
      ),
    }
    return config
  },
  experimental: {
    turbo: {
      resolveAlias: {
        "@tanstack/react-query": path.resolve(
          __dirname,
          "node_modules/@tanstack/react-query",
        ),
      },
    },
  },
}

export default nextConfig
