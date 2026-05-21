import { NextRequest, NextResponse } from "next/server"

const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL

if (!CONVEX_SITE_URL) {
  console.error("missing envar CONVEX_SITE_URL")
}

const HOP_BY_HOP = new Set([
  "transfer-encoding",
  "connection",
  "keep-alive",
  "upgrade",
])

async function proxyToConvex(req: NextRequest): Promise<NextResponse> {
  if (!CONVEX_SITE_URL) {
    return NextResponse.json(
      {
        error: "CONVEX_SITE_URL not configured",
        hint: "Ajoutez CONVEX_SITE_URL=http://127.0.0.1:3211 à apps/admin-gabon-backoffice/.env.local puis redémarrez Next.",
      },
      { status: 500 }
    )
  }

  const url = new URL(req.url)
  const targetUrl = `${CONVEX_SITE_URL}${url.pathname}${url.search}`

  const proxyHeaders: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key)) {
      proxyHeaders[key] = value
    }
  })
  proxyHeaders["accept-encoding"] = "application/json"
  proxyHeaders["host"] = new URL(CONVEX_SITE_URL).host

  try {
    const body =
      req.method !== "GET" && req.method !== "HEAD"
        ? await req.arrayBuffer()
        : undefined

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: proxyHeaders,
      redirect: "manual",
      body,
      // @ts-expect-error duplex required for streaming body
      duplex: "half",
    })

    const responseBody = await upstream.arrayBuffer()
    const headers = new Headers()

    // Forward response headers (skip hop-by-hop)
    upstream.headers.forEach((value, key) => {
      const lk = key.toLowerCase()
      if (lk === "set-cookie" || HOP_BY_HOP.has(lk)) return
      headers.set(key, value)
    })

    // Rewrite cookies for dev (HTTP localhost) :
    //   1. Strip `__Secure-` prefix (cookie name)
    //   2. Strip `Secure` flag (set by Convex on HTTPS)
    //   3. Convert `SameSite=None` → `SameSite=Lax` (Chrome refuse SameSite=None
    //      sans Secure, donc le cookie n'est jamais persisté en localhost).
    //      Lax est sûr pour notre cas : navigation top-level + same-origin XHR.
    const setCookies = (upstream.headers as any).getSetCookie?.() as
      | string[]
      | undefined
    if (setCookies && setCookies.length > 0) {
      const rewritten = setCookies.map((cookie: string) =>
        cookie
          .replaceAll("__Secure-", "")
          .replace(/;\s*Secure/gi, "")
          .replace(/SameSite=None/gi, "SameSite=Lax")
      )
      for (const cookie of rewritten) {
        headers.append("set-cookie", cookie)
      }
    }

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers,
    })
  } catch (error) {
    console.error("[auth] proxy error:", error)
    const cause = String((error as { cause?: unknown }).cause ?? error)
    const isUpstreamDown =
      error instanceof TypeError && /ECONNREFUSED|fetch failed/i.test(cause)
    if (isUpstreamDown) {
      return NextResponse.json(
        {
          error: "Convex backend unreachable",
          hint: `${CONVEX_SITE_URL} ne répond pas. Lancez le backend local avec « bun run dev:convex » depuis la racine du monorepo.`,
        },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: "Internal auth error" }, { status: 502 })
  }
}

export async function GET(req: NextRequest) {
  return proxyToConvex(req)
}
export async function POST(req: NextRequest) {
  return proxyToConvex(req)
}
export async function PUT(req: NextRequest) {
  return proxyToConvex(req)
}
export async function PATCH(req: NextRequest) {
  return proxyToConvex(req)
}
export async function DELETE(req: NextRequest) {
  return proxyToConvex(req)
}
