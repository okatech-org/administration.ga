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
    const isDev = process.env.NODE_ENV !== "production";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://*.convex.cloud`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "worker-src 'self' blob:",
              `connect-src 'self' ${isDev ? "http://127.0.0.1:* ws://127.0.0.1:* ws://localhost:*" : ""} https://*.convex.cloud https://*.convex.site wss://*.convex.cloud`,
              "frame-src 'self'",
              "media-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
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
