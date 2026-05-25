import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pour Cloud Run / monorepo : le standalone output doit inclure les
  // packages workspace en hoisting depuis la racine du monorepo.
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  reactCompiler: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    "@workspace/api",
    "@workspace/ui",
    "@workspace/routing",
  ],
  turbopack: {
    resolveAlias: {
      "@tanstack/react-query": "./node_modules/@tanstack/react-query",
      convex: "./node_modules/convex",
      "convex/react": "./node_modules/convex/react",
      // Le codegen Convex vit a la racine du monorepo (convex/_generated/).
      // Le subpath import "@workspace/api/convex/_generated/api" n'est pas
      // expose par packages/api/package.json — on alias directement.
      "@workspace/api/convex/_generated/api":
        "../../convex/_generated/api.js",
      "@workspace/api/convex/_generated/dataModel":
        "../../convex/_generated/dataModel.d.ts",
      "@workspace/api/convex/_generated/server":
        "../../convex/_generated/server.js",
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
      "@workspace/api/convex/_generated/api": path.resolve(
        __dirname,
        "../../convex/_generated/api.js",
      ),
      "@workspace/api/convex/_generated/dataModel": path.resolve(
        __dirname,
        "../../convex/_generated/dataModel.d.ts",
      ),
      "@workspace/api/convex/_generated/server": path.resolve(
        __dirname,
        "../../convex/_generated/server.js",
      ),
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
