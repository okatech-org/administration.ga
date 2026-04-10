import fs from "node:fs"
import path from "node:path"
import { defineConfig, loadEnv, type PluginOption } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

const certsDir = path.resolve(__dirname, "../../.certs")
const certFile = path.join(certsDir, "localhost+2.pem")
const keyFile = path.join(certsDir, "localhost+2-key.pem")
const hasLocalCerts = fs.existsSync(certFile) && fs.existsSync(keyFile)

// Charger les variables d'env pour le proxy dev (process.env n'est pas peuplé par Vite)
const env = loadEnv("development", __dirname, "VITE_")

// Expose VITE_ env vars to process.env pour le handler Nitro auth-proxy
if (env.VITE_CONVEX_SITE_URL) {
  process.env.VITE_CONVEX_SITE_URL = env.VITE_CONVEX_SITE_URL
  process.env.CONVEX_SITE_URL = env.VITE_CONVEX_SITE_URL
}

/**
 * Plugin Vite qui intercepte /api/dev/sign-in et /api/auth/*
 * AVANT que Nitro/TanStack Start ne traitent la requête.
 * Nécessaire car les server.handlers de TanStack Start ne sont pas
 * correctement interceptés par le middleware Nitro en dev.
 */
function devApiProxy(): PluginOption {
  return {
    name: "dev-api-proxy",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ""
        const method = req.method || "GET"

        // --- /api/dev/sign-in (POST) — forward to Convex ---
        if (url === "/api/dev/sign-in" && method === "POST") {
          const CONVEX_SITE_URL = env.VITE_CONVEX_SITE_URL
          if (!CONVEX_SITE_URL) {
            res.statusCode = 500
            res.setHeader("content-type", "application/json")
            res.end(JSON.stringify({ error: "VITE_CONVEX_SITE_URL not configured" }))
            return
          }

          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(chunk as Buffer)
            const body = Buffer.concat(chunks).toString()

            // Forward to Convex /dev/sign-in — returns { email, tempPassword }
            const devRes = await fetch(`${CONVEX_SITE_URL}/dev/sign-in`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Origin: req.headers.origin || "http://localhost:3003",
              },
              body,
            })

            const responseBody = await devRes.text()
            res.statusCode = devRes.status
            res.setHeader("content-type", "application/json")
            res.end(responseBody)
          } catch (error) {
            console.error("[dev/sign-in] proxy error:", error)
            res.statusCode = 500
            res.setHeader("content-type", "application/json")
            res.end(JSON.stringify({ error: "Proxy error" }))
          }
          return
        }

        // --- /api/auth/* (GET + POST) ---
        if (url.startsWith("/api/auth/")) {
          const CONVEX_SITE_URL = env.VITE_CONVEX_SITE_URL
          if (!CONVEX_SITE_URL) {
            res.statusCode = 503
            res.setHeader("content-type", "application/json")
            res.end(JSON.stringify({ error: "VITE_CONVEX_SITE_URL not configured" }))
            return
          }

          try {
            const targetUrl = `${CONVEX_SITE_URL}${url}`
            const proxyHeaders: Record<string, string> = {}
            for (const [key, value] of Object.entries(req.headers)) {
              if (value != null && !["transfer-encoding", "connection", "keep-alive", "upgrade"].includes(key)) {
                proxyHeaders[key] = Array.isArray(value) ? value.join(", ") : value
              }
            }
            proxyHeaders["accept-encoding"] = "identity"
            proxyHeaders["host"] = new URL(CONVEX_SITE_URL).host

            // NOTE: No outbound cookie rewriting needed.
            // useSecureCookies: false in Better Auth means cookies are named
            // "better-auth.session_token" (without __Secure- prefix) everywhere.

            let body: string | undefined
            if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
              const chunks: Buffer[] = []
              for await (const chunk of req) chunks.push(chunk as Buffer)
              body = Buffer.concat(chunks).toString()
            }

            const fetchOptions: RequestInit = {
              method,
              headers: proxyHeaders,
              redirect: "manual",
              body: body || undefined,
            }
            if (body !== undefined) {
              // @ts-expect-error duplex nécessaire pour les streaming bodies dans Node.js
              fetchOptions.duplex = "half"
            }

            const upstream = await fetch(targetUrl, fetchOptions)

            const responseBody = await upstream.arrayBuffer()
            res.statusCode = upstream.status

            // Forward Set-Cookie avec réécriture dev
            const setCookies = (upstream.headers as any).getSetCookie?.() as string[] | undefined
            if (setCookies && setCookies.length > 0) {
              const rewrittenCookies = setCookies.map(cookie => cookie.replaceAll("__Secure-", "").replace(/;\s*Secure/gi, ""))
              res.setHeader("set-cookie", rewrittenCookies)
            }

            for (const [key, value] of upstream.headers.entries()) {
              const lk = key.toLowerCase()
              if (lk === "set-cookie" || ["transfer-encoding", "connection", "keep-alive", "upgrade"].includes(lk)) continue
              res.setHeader(key, value)
            }
            
            res.setHeader("x-dev-api-proxy", "true")

            res.end(Buffer.from(responseBody))
          } catch (error) {
            console.error("[auth] proxy error:", error)
            res.statusCode = 502
            res.setHeader("content-type", "application/json")
            res.end(JSON.stringify({ error: "Internal auth error" }))
          }
          return
        }

        next()
      })
    },
  }
}

// URL du backend Convex pour le proxy auth en production
const CONVEX_SITE_URL_PROD = env.VITE_CONVEX_SITE_URL || ""

const config = defineConfig({
  plugins: [
    devApiProxy(),
    nitro({
      // Proxy /api/auth/** vers Convex en production (Nitro routeRules)
      // En dev, le plugin Vite devApiProxy() gère ce proxy
      routeRules: CONVEX_SITE_URL_PROD ? {
        "/api/auth/**": {
          proxy: `${CONVEX_SITE_URL_PROD}/api/auth/**`,
        },
      } : {},
    }),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  server: {
    host: "0.0.0.0",
    ...(hasLocalCerts ? { https: { cert: certFile, key: keyFile } } : {}),
  },
})

export default config
