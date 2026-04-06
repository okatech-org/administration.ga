import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactCompiler: false,
  transpilePackages: [
    "@workspace/api",
    "@workspace/ui",
    "@workspace/i18n",
    "@workspace/shared",
  ],
}

export default nextConfig
