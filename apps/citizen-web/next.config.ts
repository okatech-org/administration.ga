import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: false,
  transpilePackages: [
    "@workspace/api",
    "@workspace/ui",
    "@workspace/i18n",
    "@workspace/shared",
  ],
}

export default nextConfig
