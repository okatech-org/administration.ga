import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ["@workspace/ui", "@workspace/routing"],
  turbopack: {
    resolveAlias: {
      "@tanstack/react-query": "./node_modules/@tanstack/react-query",
      convex: "./node_modules/convex",
      "convex/react": "./node_modules/convex/react",
      // Alias absolu vers les types Convex générés au root du monorepo.
      // Permet aux pages d'utiliser `import { api } from "@convex/_generated/api"`.
      "@convex/_generated/api": "../../convex/_generated/api.js",
      "@convex/_generated/dataModel": "../../convex/_generated/dataModel.js",
      "@convex/_generated/server": "../../convex/_generated/server.js",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@tanstack/react-query": path.resolve(
        __dirname,
        "node_modules/@tanstack/react-query",
      ),
      convex: path.resolve(__dirname, "node_modules/convex"),
      "@convex": path.resolve(__dirname, "../../convex"),
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.travail.ga" }],
        destination: "https://travail.ga/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
