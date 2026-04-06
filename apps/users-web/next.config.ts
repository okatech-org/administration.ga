import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: [
    "@workspace/api",
    "@workspace/ui",
    "@workspace/i18n",
    "@workspace/shared",
  ],
}

export default nextConfig
